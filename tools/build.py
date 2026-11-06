"""Build Little Lives: dev page (separate scripts) + single-file dist/index.html (inlined)."""
import pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent
ORDER = ['math', 'geo', 'gl', 'textures', 'character', 'anim', 'kitchen', 'nav', 'sim', 'world', 'audio', 'main']
tpl = (ROOT / 'src/index.template.html').read_text()
(ROOT / 'dist').mkdir(exist_ok=True)
dev = tpl.replace('<!--SCRIPTS-->', '\n'.join(f'<script src="../src/{n}.js"></script>' for n in ORDER))
(ROOT / 'dist/dev.html').write_text(dev)
bundle = '\n'.join(f'// ==== {n}.js ====\n' + (ROOT / f'src/{n}.js').read_text() for n in ORDER)
out = tpl.replace('<!--SCRIPTS-->', '<script>\n' + bundle.replace('</script>', '<\\/script>') + '\n</script>')
(ROOT / 'dist/index.html').write_text(out)
print('dist/index.html', len(out) // 1024, 'KB')
