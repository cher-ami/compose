<div align="center">
<h1>Compose</h1>

![](documentation/static/img/logo.png)

![](https://img.shields.io/npm/v/@cher-ami/compose/latest.svg)
![](https://img.shields.io/bundlephobia/minzip/@cher-ami/compose.svg)
![](https://img.shields.io/npm/dt/@cher-ami/compose.svg)
![](https://img.shields.io/npm/l/@cher-ami/compose.svg)

Compose is a small and type-safe library that links your javascript to your DOM.  
_⚠️ This library is work in progress, the API is subject to change until the v1.0 release._

<br/>
<br/>
</div>

## Documentation

Check the [full documentation website](https://willybrauner.github.io/compose)

## Preview

```html
<div data-component="App">
  <header data-component="Header"></header>
</div>
```

```js
import { Component } from "@cher-ami/compose"

class App extends Component {
  static attrName = "App"
  header = this.add(Header)
  mounted() {}
  unmounted() {}
}

class Header extends Component {
  static attrName = "Header"
  // ...
}
```

## Start examples

- Clone this repo

```shell
$ git clone git@github.com:willybrauner/compose.git
```

- Install dependencies with [pnpm](https://pnpm.io/)

```shell
$ pnpm install
```

- Start example dev server

```shell
$ npm run example-basic:dev
```

## <a name="Credits"></a>Credits

[© Willy Brauner](https://willybrauner.com)

## <a name="Licence"></a>Licence

[MIT](./LICENCE)
