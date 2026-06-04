import subprocess
try:
    content = subprocess.check_output(['git', 'show', '8528a7a:frontend/index.html']).decode('utf-8')
    print("Length of content:", len(content))
    with open('scratch/index_git_old.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Saved old index.html to scratch/index_git_old.html")
except Exception as e:
    print("Error:", e)
