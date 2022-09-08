import {_decorator, Component, instantiate, js, Label, Node, Prefab, Widget} from 'cc'
import {Scene as SceneInterface, SceneContent, SceneCurtain} from '../Scene'
import {createNodeFromPrefab, restartApp} from '../_tools'

@_decorator.ccclass('Scene')
@_decorator.menu('lib/Scene')
export class Scene extends Component implements SceneInterface {
	
	public content: SceneContent
	
	private _layers: Node
	private _lock: Node
	private _error: Node
	private _lockCount: number = 0
	
	@_decorator.property({type: Prefab, visible: true})
	private _defaultCurtain: Prefab
	
	public showError(header: string, message?: string) {
		if (this._error.active) {
			return
		}
		this._layers.active = false
		
		this._error.active = true
		this._error.getChildByPath('header').getComponent(Label).string = header
		this._error.getChildByPath('message').getComponent(Label).string = (message === undefined || message === null) ? '' : message
		this._error.getChildByPath('button').once(Node.EventType.TOUCH_END, () => restartApp())
	}
	
	public lock() {
		if (++this._lockCount == 1) {
			this._lock.active = true
		}
	}
	
	public unlock() {
		if (--this._lockCount <= 0) {
			this._lockCount = 0
			this._lock.active = false
		}
	}
	
	public addLayer(): Node {
		const node = new Node()
		const widget = node.addComponent(Widget)
		
		widget.isAlignTop = true
		widget.isAlignBottom = true
		widget.isAlignLeft = true
		widget.isAlignRight = true
		
		widget.top = 0
		widget.bottom = 0
		widget.left = 0
		widget.right = 0
		
		this._layers.addChild(node)
		return node
	}
	
	public catchError(error: any) {
		console.error(error)
		this.showError('Uncaught error', error.toString())
	}
	
	protected onLoad() {
		window['scene'] = this
		
		this._layers = this.node.getChildByName('layers')
		this._lock = this.node.getChildByName('lock')
		this._error = this.node.getChildByName('error')
		
		window.addEventListener('error', e => this.catchError(e.error))
		
		this.content = new SceneContentImpl(
			this._layers.getChildByName('content'),
			this.node.getChildByName('curtain'),
			this._defaultCurtain
		)
		
		this._defaultCurtain = null
	}
}

class SceneContentImpl implements SceneContent {
	
	private _switch: SceneContentSwitch
	private _nodes: Array<Node> = []
	private _queue: Array<SceneContentSwitch> = []
	
	constructor(
		private _contentLayer: Node,
		private _curtainLayer: Node,
		private _defaultCurtain: Prefab
	) {
		this._nodes.push(this._contentLayer.children[0])
	}
	
	public add(name: string, node: string | Node, init?: (node: Node) => void, curtain?: string) {
		this.switchContent(new SceneContentSwitch_Add(name, node, init, curtain))
	}
	
	public replace(name: string, node: string | Node, init?: (node: Node) => void, unto?: string, curtain?: string) {
		this.switchContent(new SceneContentSwitch_Replace(name, node, init, curtain, unto))
	}
	
	public revert(unto?: string, curtain?: string) {
		this.switchContent(new SceneContentSwitch_Revert(curtain, unto))
	}
	
	private switchContent(s: SceneContentSwitch) {
		if (this._switch) {
			this._queue.push(s)
		}
		else {
			this._switch = s
			this.startSwitch()
		}
	}
	
	private startSwitch() {
		scene.lock()
		
		const curtain = this._switch.curtain ? createNodeFromPrefab(this._switch.curtain) : instantiate(this._defaultCurtain)
		this._curtainLayer.active = true
		this._curtainLayer.addChild(curtain)
		
		curtain.getComponent(SceneCurtain).run(() => this.doSwitch(), () => this.endSwitch())
	}
	
	private doSwitch() {
		try {
			this._contentLayer.removeAllChildren()
			this._switch.run(this._contentLayer, this._nodes)
		}
		catch (e) {
			scene.catchError(e)
		}
	}
	
	private endSwitch() {
		this._curtainLayer.destroyAllChildren()
		
		scene.unlock()
		
		this._switch = this._queue.shift()
		
		if (this._switch) {
			this.startSwitch()
		}
		else {
			this._curtainLayer.active = false
		}
	}
}

abstract class SceneContentSwitch {
	
	protected constructor(public curtain: string) {}
	
	abstract run(layer: Node, previous: Array<Node>)
	
	protected removePreviousLast(list: Array<Node>) {
		const i = list.length - 1
		const node = list[i]
		list.length = i
		node.destroy()
	}
	
	protected removePreviousUnto(list: Array<Node>, name: string) {
		let i = list.length
		while (i > 0) {
			--i
			const node = list[i]
			if (node.name == name) {
				i++
				break
			}
			node.destroy()
		}
		
		list.length = i
	}
}

class SceneContentSwitch_Add extends SceneContentSwitch {
	constructor(
		private _name: string,
		private _node: string | Node,
		private _init?: (node: Node) => void,
		curtain?: string
	) {
		super(curtain)
	}
	
	public run(layer: Node, previous: Array<Node>) {
		const node = js.isString(this._node) ? createNodeFromPrefab(this._node as string) : this._node as Node
		node.name = this._name

		if (this._init) this._init(node)
		
		layer.addChild(node)
	}
}

class SceneContentSwitch_Replace extends SceneContentSwitch_Add {
	
	constructor(
		name: string,
		node: string | Node,
		init: (node: Node) => void,
		curtain: string,
		private _unto: string
	) {
		super(name, node, init, curtain)
	}
	
	public run(layer: Node, previous: Array<Node>) {
		if (this._unto) this.removePreviousUnto(previous, this._unto)
		else this.removePreviousLast(previous)
		
		super.run(layer, previous)
	}
}

class SceneContentSwitch_Revert extends SceneContentSwitch {
	
	constructor(
		curtain: string,
		private _unto: string
	) {
		super(curtain)
	}
	
	public run(layer: Node, previous: Array<Node>) {
		if (this._unto) this.removePreviousUnto(previous, this._unto)
		else this.removePreviousLast(previous)
		
		layer.addChild(previous[previous.length - 1])
	}
}