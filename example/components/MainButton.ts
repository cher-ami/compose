import { Component } from "../../src";

const componentName = "MainButton";
const debug = require("debug")(`composition:${componentName}`);

/**
 * @name MainButton
 */
export default class MainButton extends Component {
  constructor(e) {
    super(e);
    this.init();
  }

  protected resizeHandler = () => {
    debug("window.innerWidth", window.innerWidth);
  };

  public mount() {
    debug("start mount from MainButton");
    window.addEventListener("resize", this.resizeHandler);
  }

  public unmount() {
    super.unmount();
    debug("UN mount from MainButton");
    window.removeEventListener("resize", this.resizeHandler);
  }
}
