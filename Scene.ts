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
	add(name: string, node: string | Node, on?: (node: Node) => void, curtain?: string)
	
	replace(name: string, node: string | Node, on?: (node: Node) => void, unto?: string, curtain?: string)
	
	revert(unto?: string, on?: () => void, curtain?: string)
}

export abstract class SceneCurtain extends Component {
	abstract run(onClose: () => void, onOpen: () => void)
}