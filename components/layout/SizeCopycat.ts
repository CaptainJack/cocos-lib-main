import {NormalizedComponent} from '../NormalizedComponent'
import {_decorator, Node, NodeEventType, UITransform, widgetManager} from 'cc'

@_decorator.ccclass('SizeCopycat')
@_decorator.menu('lib/layout/SizeCopycat')
@_decorator.disallowMultiple(true)
export class SizeCopycat extends NormalizedComponent {
	@_decorator.property(Node)
	private _target: Node
	
	@_decorator.property
	private _vertical: boolean = false
	
	@_decorator.property
	private _horizontal: boolean = false
	
	@_decorator.property
	private _maxWidth: number = 0
	
	@_decorator.property
	private _maxHeight: number = 0
	
	@_decorator.property
	private _minWidth: number = 0
	
	@_decorator.property
	private _minHeight: number = 0
	
	
	//
	
	@_decorator.property(Node)
	public get target(): Node {
		return this._target
	}
	
	public set target(value: Node) {
		if (this._target) {
			this._target.off(NodeEventType.SIZE_CHANGED, this.updateSize, this)
		}
		
		this._target = value
		
		if (this.enabled) {
			if (this._target) {
				this._target.on(NodeEventType.SIZE_CHANGED, this.updateSize, this)
			}
			this.updateSize()
		}
	}
	
	@_decorator.property
	public get vertical(): boolean {
		return this._vertical
	}
	
	public set vertical(value: boolean) {
		this._vertical = value
		this.updateSize()
	}
	
	@_decorator.property
	public get horizontal(): boolean {
		return this._horizontal
	}
	
	public set horizontal(value: boolean) {
		this._horizontal = value
		this.updateSize()
	}
	
	@_decorator.property
	public get maxWidth(): number {
		return this._maxWidth
	}
	
	public set maxWidth(value: number) {
		this._maxWidth = value
		this.updateSize()
	}
	
	@_decorator.property
	public get maxHeight(): number {
		return this._maxHeight
	}
	
	public set maxHeight(value: number) {
		this._maxHeight = value
		this.updateSize()
	}
	
	@_decorator.property
	public get minWidth(): number {
		return this._minWidth
	}
	
	public set minWidth(value: number) {
		this._minWidth = value
		this.updateSize()
	}
	
	@_decorator.property
	public get minHeight(): number {
		return this._minHeight
	}
	
	public set minHeight(value: number) {
		this._minHeight = value
		this.updateSize()
	}
	
	public updateSize() {
		if (this._target) {
			const size = this._target.getComponent(UITransform).contentSize.clone()
			const t = this.getComponent(UITransform)
			
			if (this._maxWidth > 0 && size.x > this._maxWidth) size.x = this._maxWidth
			if (this._maxHeight > 0 && size.y > this._maxHeight) size.y = this._maxHeight
			
			if (this._minWidth > 0 && size.x < this._minWidth) size.x = this._minHeight
			if (this._minHeight > 0 && size.y < this._minHeight) size.y = this._minHeight
			
			if (this._vertical && this._horizontal) {
				t.setContentSize(size.x, size.y)
			}
			else if (this._vertical) {
				t.height = size.y
			}
			else if (this._horizontal) {
				t.width = size.x
			}
			
			widgetManager.onResized()
		}
	}
	
	protected onLoad() {
		super.onLoad()
		
		if (!this._target) {
			this._target = this.node.parent
		}
	}
	
	protected onEnable() {
		super.onEnable()
		
		if (this._target) {
			this._target.on(NodeEventType.SIZE_CHANGED, this.updateSize, this)
		}
		
		this.updateSize()
	}
	
	protected onDisable() {
		super.onDisable()
		
		if (this._target) {
			this._target.off(NodeEventType.SIZE_CHANGED, this.updateSize, this)
		}
	}
}