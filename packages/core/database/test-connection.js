const { Pool } = require('pg');

async function testConnection() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'bizbox',
    user: 'superadmin@system.com',
    password: 'SuperAdmin123!',
  });

  try {
    const client = await pool.connect();
    console.log('✅ Database connection successful!');
    
    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('Current time:', result.rows[0].current_time);
    
    client.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  } finally {
    await pool.end();
  }
}

testConnection();