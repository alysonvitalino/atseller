require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./connection');

async function seedAdmin() {
  const email = 'admin@atseller.io';
  const password = 'Admin@123';
  const name = 'Administrador';

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows[0]) {
    console.log('✅ Admin já existe. Nada a fazer.');
    await pool.end();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role, status, company_id)
     VALUES ($1, $2, $3, 'platform_admin', 'active', NULL)`,
    [name, email, passwordHash]
  );

  console.log('✅ Admin criado com sucesso!');
  console.log(`   E-mail: ${email}`);
  console.log(`   Senha:  ${password}`);
  await pool.end();
}

seedAdmin().catch((err) => { console.error(err); process.exit(1); });
