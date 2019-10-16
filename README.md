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
  "source_dir": "",
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

**convert old NGS load and action to es6 js classes**
```
ngs convert -t `type` -m `module_name` -d `loads_actions_directory`
```

convert.config.json should be placed in the root of NGS project

**convert.config.json example**

```
[
  {
    "path": "managers/PagingManager",
    "old_name": "NGS.PagingManager",
    "name": "PagingManager"
  },
  {
    "path": "util/DialogUtility",
    "old_name": "NGS.DialogUtility",
    "name": "DialogUtility"
  }
]
```

**build minify js files**
```
ngs minify -i web/js/util/builder.json`
```


**builder.config.json example**

```
{
  "es5": true,
  "source_dir": "web/js/util/out",
  "out_file": "web/js/ngs/ngs.min.js",
  "es5_out_file": "web/js/ngs/es5-ngs.min.js",
  "compress": true,
  "files": [
    "NGS.js",
    "Events.js"
  ]
}
```