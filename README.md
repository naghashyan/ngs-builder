# NGS cli
[![NPM Version](http://img.shields.io/npm/v/commander.svg?style=flat)](https://www.npmjs.com/package/@naghashyan/ngs-builder)

## Installation

```bash
npm install -g @naghashyan/ngs-builder
```

command list

**update symlink**
```
ngs jupdate -m `module_name`
```
**build js**
```
ngs build -t `type` -m `module_name`
```
type=js, less, sass

**JS builder.json file example**
```
{
  "es5": true,
  "out_dir": "out/js",
  "es5_out_dir": "htdocs/out/js/es5",
  "compress": true,
  "builders": [
    {
      "out_dir": "ngs",
      "module": "ngs",
      "files": [
        "NGS.js",
        "Dispatcher.class.js",
        "AbstractRequest.class.js",
        "AbstractLoad.class.js",
        "AbstractAction.class.js",
        "AjaxLoader.class.js",
        "CustomEvent.js",
        "NGSEvent.js"
      ]
    }
  ]
}
```