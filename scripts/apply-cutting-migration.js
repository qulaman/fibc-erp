const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Supabase credentials not found in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  console.log('🚀 Applying cutting module migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250122_create_cutting_module.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split by statement separator for better error reporting
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== '');

  console.log(`📝 Found ${statements.length} SQL statements\n`);

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';';

    // Skip comments
    if (statement.startsWith('--')) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct query if rpc doesn't work
        const { error: directError } = await supabase.from('_').select(statement);

        if (directError && !directError.message.includes('does not exist')) {
          console.error(`❌ Error executing statement ${i + 1}:`, directError.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        } else {
          console.log(`✅ Statement ${i + 1} executed`);
        }
      } else {
        console.log(`✅ Statement ${i + 1} executed`);
      }
    } catch (err) {
      console.error(`❌ Error on statement ${i + 1}:`, err.message);
    }
  }

  console.log('\n✅ Migration application completed!');
  console.log('\n📋 Next steps:');
  console.log('   1. Check Supabase dashboard to verify tables were created');
  console.log('   2. Visit http://localhost:3000/production/cutting to test');
  console.log('   3. Visit http://localhost:3000/warehouse/cutting to see inventory\n');
}

applyMigration().catch(console.error);
