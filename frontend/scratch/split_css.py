import os

style_path = r'c:\Users\lucas\Downloads\ProyectosInteresantes\JuntAPP\frontend\src\css\style.css'
output_dir = r'c:\Users\lucas\Downloads\ProyectosInteresantes\JuntAPP\frontend\src\css'

with open(style_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

def get_lines(start_1, end_1):
    return "".join(lines[start_1 - 1 : end_1])

variables_css = get_lines(1, 86)
reset_css = get_lines(87, 264)
app_css = get_lines(265, 2608) + get_lines(2637, 3223)
print_css = get_lines(2609, 2636)
landing_css = get_lines(3224, 7150)
hero_mural_css = get_lines(7404, 7967) + get_lines(8100, 8128)

files = {
    'variables.css': variables_css,
    'reset.css': reset_css,
    'app.css': app_css,
    'print.css': print_css,
    'landing.css': landing_css,
    'hero-mural.css': hero_mural_css
}

for name, content in files.items():
    path = os.path.join(output_dir, name)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Created {name} with {len(content.splitlines())} lines.")
