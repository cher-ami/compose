import { Component } from "@cher-ami/compose"
import Header from "../components/Header"
import { defaultPlayIn, defaultPlayOut } from "../helpers/defaultTransitions"
import debug from "@cher-ami/debug"
const log = debug(`front:HomePage`)

type TStaticProps = {}

/**
 * @name HomePage
 */
export default class HomePage extends Component<TStaticProps> {
  public static attrName = "HomePage"
  public header = this.add(Header)
  public $sections = this.findAll("section")

  public mounted() {
    window.addEventListener("resize", this.resizeHandler)
  }

  public unmounted() {
    window.removeEventListener("resize", this.resizeHandler)
  }

  protected resizeHandler = () => {
    log("window.innerWidth", window.innerWidth)
  }

  // --------------------------------------------------------------------------- PAGE TRANSITION

  public playOut(goTo: string, resolve: () => void) {
    defaultPlayOut(this.$root, goTo, resolve)
  }

  public playIn(comeFrom: string, resolve: () => void) {
    defaultPlayIn(this.$root, comeFrom, resolve)
  }
}
