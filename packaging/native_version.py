"""Generate PyInstaller application version metadata from grapetree/_version.py."""

import argparse
from pathlib import Path
import re
import runpy


ROOT = Path(__file__).resolve().parents[1]


def package_version():
    version = runpy.run_path(str(ROOT / 'grapetree' / '_version.py'))['__version__']
    if not re.fullmatch(r'[0-9]+\.[0-9]+\.[0-9]+', version):
        raise ValueError('Application version must have three numeric components')
    return version


def annotate_macos_spec(spec_path):
    """Set both macOS bundle version keys before PyInstaller signs the app."""
    version = package_version()
    source = spec_path.read_text()
    anchor = re.compile(r'(app = BUNDLE\(\n\s+(?:coll|exe),\n)')
    if len(anchor.findall(source)) != 1:
        raise ValueError('Expected exactly one macOS BUNDLE in generated spec')
    fields = (f'    version={version!r},\n'
              + f"    info_plist={{'CFBundleVersion': {version!r}}},\n")
    spec_path.write_text(anchor.sub(lambda match: match.group(1) + fields,
                                    source, count=1))


def write_windows_resource(destination):
    """Write PyInstaller's VSVersionInfo text resource for the Windows exe."""
    version = package_version()
    numbers = tuple(int(part) for part in version.split('.')) + (0,)
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(f'''VSVersionInfo(
  ffi=FixedFileInfo(filevers={numbers!r}, prodvers={numbers!r},
                    mask=0x3f, flags=0x0, OS=0x40004,
                    fileType=0x1, subtype=0x0, date=(0, 0)),
  kids=[
    StringFileInfo([
      StringTable('040904B0', [
        StringStruct('CompanyName', 'GrapeTree'),
        StringStruct('FileDescription', 'GrapeTree'),
        StringStruct('FileVersion', {version!r}),
        StringStruct('ProductName', 'GrapeTree'),
        StringStruct('ProductVersion', {version!r}),
      ])
    ]),
    VarFileInfo([VarStruct('Translation', [1033, 1200])]),
  ]
)
''')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('format', choices=('mac-spec', 'windows-resource'))
    parser.add_argument('path', type=Path)
    args = parser.parse_args()
    if args.format == 'mac-spec':
        annotate_macos_spec(args.path)
    else:
        write_windows_resource(args.path)


if __name__ == '__main__':
    main()
