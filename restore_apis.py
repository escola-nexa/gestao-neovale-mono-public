import json
import os

log_file = "/home/marcelo/.gemini/antigravity/brain/c6288331-b213-4cde-b05d-c8d924677d5d/.system_generated/logs/overview.txt"
with open(log_file, 'r') as f:
    for line in f:
        try:
            data = json.loads(line)
            tool_calls = data.get("tool_calls", [])
            for call in tool_calls:
                if call.get("name") == "write_to_file":
                    args = call.get("args", {})
                    target = args.get("TargetFile", "").strip('"')
                    code = args.get("CodeContent", "")
                    
                    if code.startswith('"') and code.endswith('"'):
                        # Actually JSON load the string to handle escaped newlines properly
                        code = json.loads('{"c": ' + code + '}')['c']
                    
                    if target and code and "api.ts" in target:
                        os.makedirs(os.path.dirname(target), exist_ok=True)
                        with open(target, 'w') as out:
                            out.write(code)
                        print(f"Restored {target}")
        except Exception as e:
            pass
