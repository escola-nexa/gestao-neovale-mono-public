const fs = require('fs');
const file = '/home/marcelo/projetos/cleyton/sigeo-navigator/src/features/rh/lib/indicationLinksApi.ts';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('import { nestApi }')) {
  content = content.replace("import { supabase } from '@/integrations/supabase/client';", "import { supabase, API_PROVIDER } from '@/integrations/supabase/client';\nimport { nestApi } from '@/lib/api-adapter';");
}

fs.writeFileSync(file, content);
