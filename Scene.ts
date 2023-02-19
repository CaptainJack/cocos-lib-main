import {ccenum, Component, Node, Vec3} from 'cc'

declare global {
	const scene: Scene
}

export interface Scene {
	readonly node: Node
	readonly content: SceneContent
	readonly orientation: SceneOrientation
	
	lock()
	
	unlock()
	
	getLayer(name: string): Node
	
	showError(header: string, message?: string)
	
	catchError(error: any): void
	
	getPointPosition(point: ScenePoint, space: Node): Vec3
}


export interface SceneContent {
	add(name: string, node: string | Node, on?: (node: Node) => void, curtain?: string)
	
	replace(name: string, node: string | Node, on?: (node: Node) => void, unto?: string, curtain?: string)
	
	revert(unto?: string, on?: () => void, curtain?: string)
}

export abstract class SceneCurtain extends Component {
	abstract run(onClose: () => void, onOpen: () => void)
}

export enum SceneOrientation {
	ABSENT,
	PORTRAIT,
	LANDSCAPE
}

export namespace SceneOrientation {
	export function nameLower(v: SceneOrientation): string {
		switch (v) {
			case SceneOrientation.ABSENT:
				return null
			case SceneOrientation.PORTRAIT:
				return 'portrait'
			case SceneOrientation.LANDSCAPE:
				return 'landscape'
		}
	}
	
	export function nameCamel(v: SceneOrientation): string {
		switch (v) {
			case SceneOrientation.ABSENT:
				return null
			case SceneOrientation.PORTRAIT:
				return 'Portrait'
			case SceneOrientation.LANDSCAPE:
				return 'Landscape'
		}
	}
}

ccenum(SceneOrientation)


export enum ScenePoint {
	CENTER_TOP,
	CENTER_BOTTOM,
	LEFT_CENTER,
	RIGHT_CENTER,
}