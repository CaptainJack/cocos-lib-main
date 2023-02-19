import {_decorator, instantiate, js, Label, macro, Node, Prefab, ResolutionPolicy, screen, sys, UITransform, Vec3, view, widgetManager} from 'cc'
import {Scene, SceneContent, SceneCurtain, SceneOrientation, ScenePoint} from '../../Scene'
import {createNodeFromPrefab, restartApp} from '../../_tools'
import {NormalizedComponent} from '../NormalizedComponent'

@_decorator.ccclass('Canvas')
@_decorator.menu('lib/Canvas')
@_decorator.disallowMultiple
export class Canvas extends NormalizedComponent implements Scene {
	public content: SceneContent
	
	private _lock: Node
	private _error: Node
	private _lockCount: number = 0
	
	@_decorator.property({type: Node, visible: true})
	private _layers: Node
	
	@_decorator.property({type: Prefab, visible: true})
	private _curtain: Prefab
	
	@_decorator.property({type: SceneOrientation, visible: true})
	private _versatile: SceneOrientation = SceneOrientation.ABSENT
	
	@_decorator.property({visible: true})
	private _versatileWidth: number = 0
	
	@_decorator.property({visible: true})
	private _versatileHeight: number = 0
	
	private points = new Map<ScenePoint, Node>()
	
	public get orientation(): SceneOrientation {
		return this._versatile
	}
	
	public getPointPosition(point: ScenePoint, space: Node): Vec3 {
		return space.getComponent(UITransform).convertToNodeSpaceAR(this.points.get(point).worldPosition)
	}
	
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
	
	public getLayer(name: string): Node {
		return this._layers.getChildByName(name)
	}
	
	public catchError(error: any) {
		console.error(error)
		this.showError('Uncaught error', error.toString())
		if (window['ecw']) window['ecw'].catchError(error)
	}
	
	protected onLoad() {
		super.onLoad()
		
		const loader = document.getElementById('loader')
		if (loader) loader.parentElement.removeChild(loader)
		
		window['scene'] = this
		
		switch (this._versatile) {
			case SceneOrientation.PORTRAIT:
				view.setOrientation(macro.ORIENTATION_PORTRAIT)
				view.setDesignResolutionSize(this._versatileWidth, this._versatileHeight, ResolutionPolicy.FIXED_WIDTH)
				break
			case SceneOrientation.LANDSCAPE:
				view.setOrientation(macro.ORIENTATION_LANDSCAPE)
				view.setDesignResolutionSize(this._versatileWidth, this._versatileHeight, ResolutionPolicy.FIXED_HEIGHT)
				if (sys.isBrowser) {
					view.resizeWithBrowserSize(true)
					const element = document.getElementById('GameDiv') as HTMLDivElement
					window.addEventListener('resize', () => {
						if (!screen.fullScreen()) {
							element.style.removeProperty('width')
							element.style.removeProperty('height')
							// @ts-ignore
							view._updateAdaptResult(screen.windowSize.width, screen.windowSize.height)
						}
					})
				}
				break
		}
		
		if (!this._layers) {
			this._layers = this.node.getChildByPath('layers')
		}
		this._lock = this.node.getChildByName('lock')
		this._error = this.node.getChildByName('error')
		
		window.addEventListener('error', e => this.catchError(e.error))
		
		this.content = new SceneContentImpl(
			this._layers.getChildByName('content'),
			this.node.getChildByName('curtain'),
			this._curtain
		)
		
		this._curtain = null
		
		this.points.set(ScenePoint.CENTER_TOP, this.node.getChildByName('point-center-top'))
		this.points.set(ScenePoint.CENTER_BOTTOM, this.node.getChildByName('point-center-bottom'))
		this.points.set(ScenePoint.LEFT_CENTER, this.node.getChildByName('point-left-center'))
		this.points.set(ScenePoint.RIGHT_CENTER, this.node.getChildByName('point-right-center'))
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
	
	public add(name: string, node: string | Node, on?: (node: Node) => void, curtain?: string) {
		this.switchContent(new SceneContentSwitch_Add(name, node, on, curtain))
	}
	
	public replace(name: string, node: string | Node, on?: (node: Node) => void, unto?: string, curtain?: string) {
		this.switchContent(new SceneContentSwitch_Replace(name, node, on, curtain, unto))
	}
	
	public revert(unto?: string, on?: () => void, curtain?: string) {
		this.switchContent(new SceneContentSwitch_Revert(curtain, on, unto))
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
			widgetManager.onResized()
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
	
	abstract run(layer: Node, nodes: Array<Node>)
	
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
		private _call?: (node: Node) => void,
		curtain?: string
	) {
		super(curtain)
	}
	
	public run(layer: Node, nodes: Array<Node>) {
		const node = js.isString(this._node) ? createNodeFromPrefab(this._node as string) : this._node as Node
		node.name = this._name
		
		if (this._call) this._call(node)
		
		layer.addChild(node)
		nodes.push(node)
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
	
	public run(layer: Node, nodes: Array<Node>) {
		if (this._unto) this.removePreviousUnto(nodes, this._unto)
		else this.removePreviousLast(nodes)
		
		super.run(layer, nodes)
	}
}

class SceneContentSwitch_Revert extends SceneContentSwitch {
	
	constructor(
		curtain: string,
		private _call: () => void,
		private _unto: string
	) {
		super(curtain)
	}
	
	public run(layer: Node, previous: Array<Node>) {
		if (this._unto) this.removePreviousUnto(previous, this._unto)
		else this.removePreviousLast(previous)
		
		if (this._call) this._call()
		
		layer.addChild(previous[previous.length - 1])
	}
}