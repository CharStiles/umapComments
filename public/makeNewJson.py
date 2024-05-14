# import json

# # Load data from image_page_data.json
# with open('image_page_data.json', 'r') as image_file:
#     image_data = json.load(image_file)

# # Load data from comments_shaderID.json
# with open('comments_shaderID.json', 'r') as comments_file:
#     comments_data = json.load(comments_file)

# # Create a dictionary to map shaderID to filename
# shaderid_to_filename = {item['shaderID']: item['filename'] for item in image_data}

# # Create a list to store the combined data
# combined_data = []

# # Iterate through comments data
# for comment, shaderID in comments_data:
#     # Check if the shaderID exists in the mapping
#     if shaderID in shaderid_to_filename:
#         # Append the comment, shaderID, and filename to the combined data
#         combined_data.append([comment, shaderID, shaderid_to_filename[shaderID]])

# # Save combined data to comments_shaderID_shaderImg.json
# with open('comments_shaderID_shaderImg_windex.json', 'w') as combined_file:
#     json.dump(combined_data, combined_file, indent=4)

# import json

# # Read data from comments_shaderID_shaderImg.json
# with open('comments_shaderID_shaderImg.json', 'r') as file:
#     data = json.load(file)

# # Append index to each list
# for i in range(len(data)):
#     data[i].append(i)

# # Write modified data back to the file
# with open('comments_shaderID_shaderImg_idx.json', 'w') as file:
#     json.dump(data, file, indent=4)



import json

# Load data from the first JSON file (missing comments)
with open('comments_shaderID_shaderImg_idx.json', 'r') as file:
    missing_comments_data = json.load(file)

# Load data from the second JSON file (complete comments)
with open('comments_shaderID.json', 'r') as file:
    complete_comments_data = json.load(file)

# Initialize a list to store the merged data
merged_data = []

# Iterate through the complete comments data
for comment_id_pair in complete_comments_data:
    # Extract comment and ID from the complete comments data
    comment = comment_id_pair[0]
    comment_id = comment_id_pair[1]
    
    # Check if the comment exists in the missing comments data
    found = False
    for item in missing_comments_data:
        if item[0] == comment and item[1] == comment_id:
            found = True
            break
    
    # If the comment is not found in the missing comments data, add it
    if not found:
        merged_data.append([comment, comment_id, '', len(merged_data)])
    
    # If the comment is found, add it from the missing comments data
    else:
        merged_data.append(item)

# Save the merged data to a new JSON file
with open('merged_file.json', 'w') as file:
    json.dump(merged_data, file, indent=4)
