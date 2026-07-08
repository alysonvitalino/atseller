require('dotenv').config();
const pool = require('./connection');

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'suspended')),
        settings JSONB NOT NULL DEFAULT '{}',
        blocked_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(30) NOT NULL CHECK (role IN ('platform_admin', 'gestor', 'operador')),
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        reset_token VARCHAR(255),
        reset_token_expires_at TIMESTAMPTZ,
        last_login_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(100),
        entity_id UUID,
        metadata JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_connections (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
        instance_name VARCHAR(100) NOT NULL UNIQUE,
        status VARCHAR(20) NOT NULL DEFAULT 'disconnected'
          CHECK (status IN ('connected', 'disconnected', 'connecting', 'error')),
        phone VARCHAR(30),
        last_heartbeat TIMESTAMPTZ,
        connected_at TIMESTAMPTZ,
        stats JSONB NOT NULL DEFAULT '{"messages_received": 0, "messages_sent": 0}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS whatsapp_messages_queue (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        instance_name VARCHAR(100) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        payload JSONB NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
      CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_wpp_conn_company ON whatsapp_connections(company_id);
      CREATE INDEX IF NOT EXISTS idx_wpp_queue_company ON whatsapp_messages_queue(company_id);
      CREATE INDEX IF NOT EXISTS idx_wpp_queue_processed ON whatsapp_messages_queue(processed, created_at);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        objective TEXT,
        personality VARCHAR(30) NOT NULL DEFAULT 'friendly'
          CHECK (personality IN ('formal', 'consultive', 'friendly', 'sales', 'technical')),
        context TEXT,
        success_criteria TEXT,
        delay_min INTEGER NOT NULL DEFAULT 2,
        delay_max INTEGER NOT NULL DEFAULT 15,
        status VARCHAR(20) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'inactive')),
        tools JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base_documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL
          CHECK (type IN ('pdf', 'docx', 'txt', 'url', 'text')),
        source VARCHAR(1000),
        status VARCHAR(20) NOT NULL DEFAULT 'processing'
          CHECK (status IN ('processing', 'ready', 'error')),
        chunk_count INTEGER NOT NULL DEFAULT 0,
        error_message TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES knowledge_base_documents(id) ON DELETE CASCADE,
        agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        embedding JSONB,
        chunk_index INTEGER NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_agents_company ON agents(company_id);
      CREATE INDEX IF NOT EXISTS idx_kb_docs_agent ON knowledge_base_documents(agent_id);
      CREATE INDEX IF NOT EXISTS idx_kb_chunks_agent ON knowledge_base_chunks(agent_id);
      CREATE INDEX IF NOT EXISTS idx_kb_chunks_document ON knowledge_base_chunks(document_id);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS flows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT FALSE,
        nodes JSONB NOT NULL DEFAULT '[]',
        edges JSONB NOT NULL DEFAULT '[]',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        conversation_id UUID,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(30),
        email VARCHAR(255),
        source VARCHAR(100) DEFAULT 'whatsapp',
        status VARCHAR(30) NOT NULL DEFAULT 'novo_lead'
          CHECK (status IN ('novo_lead','qualificado','em_negociacao','proposta_enviada','venda_concluida','perdido')),
        pipeline_stage VARCHAR(30) NOT NULL DEFAULT 'novo_lead',
        interest TEXT,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        flow_id UUID REFERENCES flows(id) ON DELETE SET NULL,
        lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
        current_node_id VARCHAR(100),
        phone VARCHAR(30) NOT NULL,
        contact_name VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'active'
          CHECK (status IN ('active','waiting','human','closed')),
        assigned_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
        assigned_operator_id UUID REFERENCES users(id) ON DELETE SET NULL,
        metadata JSONB NOT NULL DEFAULT '{}',
        last_message_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
        company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user','assistant','system')),
        content TEXT NOT NULL,
        sender_type VARCHAR(20) CHECK (sender_type IN ('contact','agent','operator','system')),
        sender_id UUID,
        whatsapp_message_id VARCHAR(200),
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_phone_company
        ON conversations(company_id, phone)
        WHERE status != 'closed';
      CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);
      CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_flows_company ON flows(company_id);
      CREATE INDEX IF NOT EXISTS idx_leads_company ON leads(company_id);
      CREATE INDEX IF NOT EXISTS idx_leads_conversation ON leads(conversation_id);
    `);

    await client.query('COMMIT');
    console.log('✅ Migrations executadas com sucesso.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Erro durante migration:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch(() => process.exit(1));
