import { Component } from "../../src";
import MainButton from "./MainButton";

const componentName = "Header";
const debug = require("debug")(`front:${componentName}`);

/**
 * @name Header
 */
export default class Header extends Component {
  public static attrName = "Header";

  constructor($root, props) {
    super($root, props);
    this.init();
  }

  public mounted() {
    debug("start mount from header");
    window.addEventListener("resize", this.resizeHandler);
  }

  public unmounted() {
    debug("UN mount from header");
    window.removeEventListener("resize", this.resizeHandler);
  }

  protected resizeHandler = () => {
    debug("window.innerWidth", window.innerWidth);
  };
}
