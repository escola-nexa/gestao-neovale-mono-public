import os
import re

missing_apis = {}

for root, dirs, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            filepath = os.path.join(root, file)
            with open(filepath, 'r') as f:
                content = f.read()
                
                matches = re.finditer(r'import\s+\{([^}]+)\}\s+from\s+[\'"]([^\'"]*api)[\'"]', content)
                for match in matches:
                    imported_vars = [v.strip() for v in match.group(1).split(',')]
                    import_path = match.group(2)
                    
                    if import_path.startswith('@/'):
                        api_path = import_path.replace('@/', 'src/') + '.ts'
                    elif import_path.startswith('.'):
                        api_path = os.path.normpath(os.path.join(os.path.dirname(filepath), import_path)) + '.ts'
                    else:
                        continue
                        
                    if not os.path.exists(api_path):
                        if api_path not in missing_apis:
                            missing_apis[api_path] = set()
                        for v in imported_vars:
                            if ' as ' in v:
                                v = v.split(' as ')[0].strip()
                            missing_apis[api_path].add(v)

for api_path, exports in missing_apis.items():
    print(f"Generating stub for {api_path} with exports {exports}")
    os.makedirs(os.path.dirname(api_path), exist_ok=True)
    with open(api_path, 'w') as f:
        f.write("import { supabase } from '@/integrations/supabase/client';\n")
        f.write("import { nestApi } from '@/lib/api-adapter';\n")
        f.write("const API_PROVIDER = import.meta.env.VITE_API_PROVIDER || 'supabase';\n\n")
        
        for exp in exports:
            f.write(f"export const {exp} = {{}} as any;\n")

print("Done!")
