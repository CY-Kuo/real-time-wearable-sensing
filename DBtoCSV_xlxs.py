import pandas as pd
import json

parsed_data = []
fno = "sec4_20mm_7.75kgf"   #FILE NAME: DATE and TIME

# Function to process JSON data
def process_json(json_str):
    # Remove leading and trailing whitespace characters
    json_str = json_str.strip()
    # Parse the JSON object
    return json.loads(json_str)
i = 0
# Load JSON data into a pandas DataFrame
with open('database.db') as file:
    #json_data = file.read()
    for line in file:
        # Remove leading and trailing whitespace characters
        #line = line.strip()
        # Check if line is not empty
        i=i+1
        if (line and i > 2):
            # Parse JSON data
            newline = line.replace('\\r\\n', ',')
             # Split the line using commas
            parts = newline.split(',')
            # Parse each part as JSON and append to the parsed data list
            parsed_data.append(parts)
            # Parse each part as JSON and append to the parsed data list
            
# Convert parsed data to DataFrame
df = pd.DataFrame(parsed_data)

# Write DataFrame to a CSV file
df.to_csv('%s_data.csv' % fno, index=False)
# Convert DataFrame to CSV


# Convert DataFrame to Excel
df.to_excel('%s_data.xlsx' % fno, index=False)