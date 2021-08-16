import { Component } from "../../../src";
import debugModule from "debug";
import Header from "../components/Header";
import { gsap } from "gsap";
const debug = debugModule(`front:HomePage`);

/**
 * @name HomePage
 */
export default class HomePage extends Component  {
  public static attrName = "HomePage";

  constructor($root, props) {
    super($root, props);
    this.init();
  }

  public components = {
    Header: this.add(Header),
  };

  public mounted() {
    window.addEventListener("resize", this.resizeHandler);
  }

  public unmounted() {
    window.removeEventListener("resize", this.resizeHandler);
  }

  protected resizeHandler = () => {
    debug("window.innerWidth", window.innerWidth);
  };

  // ------------------------------------------------------------------------------------- PAGE TRANSITION

  public playIn($root?: HTMLElement, goFrom?: string): Promise<any> {
    debug("goTo", goFrom, this);
    return new Promise((resolve) => {
      gsap.fromTo(
        this.$root,
        {
          autoAlpha: 0,
          x: -100,
        },
        {
          x: 0,
          autoAlpha: 1,
          duration: 0.4,
          ease: "power3.inOut",
          onComplete: resolve,
        }
      );
    });
  }
}
