import os
import fnmatch

def extract_file_details(root_folder, output_file):
    # Define patterns for HTML, CSS, and JS files
    patterns = ['*.html', '*.css', '*.js']

    # Create or overwrite the output file
    with open(output_file, 'w', encoding='utf-8') as out_file:
        # Walk through the directory
        for root, _, files in os.walk(root_folder):
            for pattern in patterns:
                for filename in fnmatch.filter(files, pattern):
                    file_path = os.path.join(root, filename)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        out_file.write(f"File: {file_path}\n")
                        out_file.write("------------------------------------------------------------\n")
                        out_file.write(content)
                        out_file.write("\n\n")
                    except Exception as e:
                        out_file.write(f"Error reading {file_path}: {e}\n\n")

if __name__ == '__main__':
    root_folder = '.'  # Scan the current directory and subdirectories
    output_file = 'extracted_files_details.txt'  # Output file name
    extract_file_details(root_folder, output_file)
    print(f"Details extracted to {output_file}")
