import {ccenum, Component, Node} from 'cc'

declare global {
	const scene: Scene
}

export interface Scene {
	readonly node: Node
	readonly content: SceneContent
	readonly versatile: SceneVersatile
	
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

export enum SceneVersatile {
	ABSENT,
	PORTRAIT,
	LANDSCAPE
}

export namespace SceneVersatile {
	export function name(v: SceneVersatile): string {
		switch (v) {
			case SceneVersatile.ABSENT:
				return null
			case SceneVersatile.PORTRAIT:
				return 'portrait'
			case SceneVersatile.LANDSCAPE:
				return 'landscape'
		}
	}
}

ccenum(SceneVersatile)