import {Component, Node} from 'cc'

declare global {
	const scene: Scene
}

export interface Scene {
	readonly node: Node
	readonly content: SceneContent
	
	lock()
	
	unlock()
	
	getLayer(name: string): Node
	
	showError(header: string, message?: string)
	
	catchError(error: any): void
}


export interface SceneContent {
	add(name: string, node: string | Node, init?: (node: Node) => void, curtain?: string)
	
	replace(name: string, node: string | Node, init?: (node: Node) => void, curtain?: string)
	
	revert(name?: string, curtain?: string)
}

export abstract class SceneCurtain extends Component {
	abstract run(onClose: () => void, onOpen: () => void)
}