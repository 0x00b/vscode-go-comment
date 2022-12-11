# GoComment

<!-- Plugin description -->
**GoComment** is a plugin for vscode, auto generate for golang function, variable, struct comments.
使用默认模版可以生成满足golint要求的注释。可在vscode扩展插件中搜索 GoComment。
本仓库是vscode版本，对应的goland版本地址 https://github.com/0x00b/golandanno 。
<br/>

## <t1>How to use</t1>
+ **control + command + / (For windows: control + alt + /)**
   
## config template
+ 1. shift+command+p -> open setting (`json`)
+ 2. add line `"functionTemplate": "// ${func_name} \n//  @receiver ${receiver_name} \n//  @param ${param_name} \n//  @return ${return_name} "`,
+ 3. add line `"typeTemplate": "// ${type_name} "` 

<br/>
推荐使用默认注释，满足Golang godoc注释规范，满足golint默认扫描规则。<br/>

![](https://raw.githubusercontent.com/0x00b/golandanno/main/src/main/resources/intro.gif)

使用godoc查看注释效果如下：

```shell
godoc -http=localhost:6060
```
![](https://raw.githubusercontent.com/0x00b/golandanno/main/src/main/resources/img_1.png)

![](https://raw.githubusercontent.com/0x00b/golandanno/main/src/main/resources/godoc.gif)


<!-- Plugin description end -->
 
# Getting started

## How to install
1.vscode plugins marketplace(search GoComment)

### special tag, represent beginning of a special line.
* @receiver ： golang function receiver
* @param ： golang function parameter 
* @return ： golang function return parameter
* @author ： author name, or use ${git_name}
* @date ： use ${date}, if not set, use current date
* @update ： update tag, maybe config as `"${git_name} ${date}"`, update `"${date}"` always

### support variable
```go
func (r receiver)Foo(i interface{}) (e error)
```
```
* ${func_name} : function name is "Foo".
* ${receiver_name} : will be replaced by "r".
* ${receiver_type} : will be replaced by "receiver".
* ${receiver_name_type} :  will be replaced by "r receiver".
* ${param_name} : "i"
* ${param_type} : "interface{}"
* ${param_name_type} : "i interface{}"
* ${return_name} : "e"
* ${return_type} : "error"
* ${return_name_type} : "e error"
* ${package_name} : package name
* ${type_name} : type Int int64,  ${type_name} is "Int"
* ${var_name} : var n int, ${var_name} is "n"
* ${var_type} : var n int, ${var_type} is "int"
* ${date} : date
* ${git_name}: git config name
```

### how to build and publish
```shell
vsce login publisher #login first, if need
vsce package
vsce publish
```