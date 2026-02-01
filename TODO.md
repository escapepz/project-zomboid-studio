## DROP/WONTFIX
add lua minifier when "pzstudio build" command
"pzstudio build" command better output to dist folder in root with minified
for future use of junction that help run multiple instances of game client
update.ts also update .vscode folder? NO not a good idea

## WIP
move to typeszed for better workflow

## DONE
the folder should respect unix capable run on both windows and linux
like "Teleportal Prototype" -> teleportal_prototype
like "TeleportalPrototype" -> teleportalprototype
emmylua ignore .docs
remove the file in .vscode
stylua support
update.ts use git pull instead of delete/re-create
move buildDate to single file in dist so it will not change the package.json
copy pzstudio.cmd to dist after build pzstudio project
add more script for package.json
Enforce snake_case for mod IDs in new/add commands
Remove all .gitkeep on build (preserved in new/add)

## TODO

fix the icon.png, poster.png and mod.info inside versioning folder
backward compatible with b41
support dual version folder structure


|   icon.png
|   mod.info
|   poster.png
|
+---42.12
|   |   mod.info
|   |
|   \---media
|       +---lua
|       |   |
|       |   +---server
|       |   |
|       |   \---shared
|       |       \---Translate
|       |           \---EN
|       |
|       \---scripts
|
+---42.13
|   |   mod.info
|   |
|   \---media
|       |   registries.lua
|       |
|       +---lua
|       |   +---client
|       |   |
|       |   +---server
|       |   |
|       |   \---shared
|       |       \---Translate
|       |           \---EN
|       |
|       \---scripts
|
+---common
|   |   icon.png
|   |   poster.png
|   |
|   \---media
|       +---models_X
|       \---textures
|
\---media
    +---lua
    |   +---client
    |   |  
    |   +---server
    |   |   
    |   \---shared
    |       \---Translate
    |           \---EN
    |
    +---models_X
    |
    +---scripts
    |
    \---textures
