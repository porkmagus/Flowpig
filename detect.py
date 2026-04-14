import os, re

dirs = ['apps/web/src', 'apps/api/src']
files = []

for d in dirs:
    for root, _, filenames in os.walk(d):
        for f in filenames:
            if f.endswith('.ts') or f.endswith('.tsx'):
                files.append(os.path.join(root, f))

files_set = set(os.path.abspath(f) for f in files)
imports_map = {}

for f in files:
    content = open(f, 'r', encoding='utf-8').read()
    deps = []
    for m in re.finditer(r"import\s+.*?\s+from\s+['\"]([^'\"]+)['\"]", content):
        src = m.group(1)
        if src.startswith('.') or src.startswith('~'):
            d = os.path.dirname(f)
            if src.startswith('~'):
                resolved = os.path.abspath(os.path.join('apps/web/src', src[2:]))
            else:
                resolved = os.path.abspath(os.path.join(d, src))
            for ext in ['', '.ts', '.tsx', '/index.ts', '/index.tsx']:
                candidate = resolved + ext
                if candidate in files_set:
                    deps.append(candidate)
                    break
    imports_map[os.path.abspath(f)] = deps

visited = set()
rec_stack = set()
cycles = []

def dfs(node, stack):
    visited.add(node)
    rec_stack.add(node)
    for dep in imports_map.get(node, []):
        if dep not in visited:
            dfs(dep, stack + [dep])
        elif dep in rec_stack:
            idx = stack.index(dep)
            cycles.append(stack[idx:] + [dep])
    rec_stack.remove(node)

for f in files_set:
    if f not in visited:
        dfs(f, [f])

if not cycles:
    print('No circular imports found.')
else:
    print('Circular imports found:')
    for i, c in enumerate(cycles):
        print(i+1, ' -> '.join(os.path.relpath(p) for p in c))
