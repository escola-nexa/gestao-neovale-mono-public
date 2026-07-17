import re

with open('backend/src/app.module.ts', 'r') as f:
    content = f.read()

# We need to find the entities: [ ... ] block that contains all the modules.
# It starts at: entities: [__dirname + '/**/*.entity{.ts,.js}',
# And ends at: WeeklyTeachingModelsModule\n  ],
# Then we need to extract the modules, close the entities array properly,
# and append the modules to the end of the imports array.

# First, split the file at `entities: [`
parts = content.split("entities: [__dirname + '/**/*.entity{.ts,.js}',\n")
if len(parts) == 2:
    prefix = parts[0]
    rest = parts[1]
    
    # Split the rest at `  ],\n      synchronize: false,`
    modules_part, suffix = rest.split("  ],\n      synchronize: false,")
    
    # The modules_part contains all the modules like `    AcademicBimestersModule,\n...`
    # Let's fix the entities array
    new_entities = "entities: [__dirname + '/**/*.entity{.ts,.js}'],\n      synchronize: false,"
    
    # Let's extract the modules
    modules_list = modules_part.strip()
    if modules_list.endswith(','):
        modules_list = modules_list[:-1]
    
    # Now we need to append the modules to the end of the `imports: [` array.
    # The suffix ends with:
    #     AlunoModule,
    #     AuthModule,
    #     SchoolsModule,
    #   ],
    
    new_suffix = suffix.replace(
        "    SchoolsModule,\n  ],",
        f"    SchoolsModule,\n{modules_part}  ],"
    )
    
    new_content = prefix + new_entities + new_suffix
    
    with open('backend/src/app.module.ts', 'w') as f:
        f.write(new_content)
    print("Fixed app.module.ts successfully")
else:
    print("Could not find the target pattern")
