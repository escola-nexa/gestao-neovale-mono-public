import json
import os
import glob

brain_dir = "/home/marcelo/.gemini/antigravity/brain"
log_files = glob.glob(os.path.join(brain_dir, "*", ".system_generated", "logs", "overview.txt"))

restored = 0
for log_file in log_files:
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
                            code = json.loads('{"c": ' + code + '}')['c']
                        
                        if target and code and ("api.ts" in target or target.endswith("api.ts")):
                            if not os.path.exists(target):
                                os.makedirs(os.path.dirname(target), exist_ok=True)
                                with open(target, 'w') as out:
                                    out.write(code)
                                restored += 1
                                print(f"Restored {target}")
            except Exception as e:
                pass
print(f"Total restored: {restored}")
