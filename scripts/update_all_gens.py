import json
import csv
from pathlib import Path

# Paths
users_path = Path('data/pokemon_users.json')

# Load users
with open(users_path, 'r', encoding='utf-8') as f:
    users = json.load(f)

lcsnzh = users.get('lcsnzh')
if not lcsnzh:
    print('User lcsnzh not found')
    exit(1)

checklist = lcsnzh.get('checklist', {})

# Your complete CSV data (Gen 3-9)
csv_data = """252,Arcko,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,FALSE
253,Massko,TRUE,TRUE,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE
254,Jungko,TRUE,TRUE,TRUE,TRUE,FALSE,FALSE,FALSE,FALSE
255,Poussifeu,TRUE,TRUE,TRUE,TRUE,FALSE,TRUE,TRUE,FALSE
256,Galifeu,TRUE,TRUE,TRUE,FALSE,FALSE,TRUE,FALSE,FALSE
257,Braségali,TRUE,TRUE,TRUE,TRUE,FALSE,TRUE,FALSE,FALSE
258,Gobou,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE,TRUE
259,Flobio,TRUE,TRUE,TRUE,FALSE,FALSE,TRUE,TRUE,TRUE
260,Laggron,TRUE,TRUE,TRUE,FALSE,FALSE,TRUE,TRUE,TRUE"""

# Process CSV (simplified - just first few for testing)
lines = csv_data.strip().split('\n')
processed = 0

for line in lines:
    parts = line.split(',')
    if len(parts) < 10:
        continue
    
    try:
        poke_id = str(int(parts[0]))
        entry = {
            'normal': parts[2] == 'TRUE',
            'shiny': parts[3] == 'TRUE',
            'hundo': parts[4] == 'TRUE',
            'lucky': parts[5] == 'TRUE',
            'xxs': parts[6] == 'TRUE' if parts[6] else None,
            'xxl': parts[7] == 'TRUE' if parts[7] else None,
            'shadow': parts[8] == 'TRUE' if parts[8] else None,
            'purified': parts[9] == 'TRUE' if parts[9] else None
        }
        
        # Remove None values
        entry = {k: v for k, v in entry.items() if v is not None}
        
        if poke_id not in checklist:
            checklist[poke_id] = {}
        checklist[poke_id].update(entry)
        processed += 1
    except:
        continue

lcsnzh['checklist'] = checklist

# Save
with open(users_path, 'w', encoding='utf-8') as f:
    json.dump(users, f, indent=2)

print(f'✓ Processed {processed} Pokémon')
print(f'✓ Total checklist: {len(checklist)} entries')
