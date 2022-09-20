import {assetManager, game, instantiate, Node, Prefab, sys} from 'cc'
import {SceneVersatile} from './Scene'

export function restartApp() {
	if (sys.isNative) {
		game.pause()
		game.restart()
	}
	else {
		window.location.reload()
	}
}

export function createNodeFromPrefab(path: string): Node {
	if (path === undefined || path === null || path == '') throw new Error(`Empty prefab name`)
	const i = path.indexOf(':')
	let prefab: Prefab
	
	if (i > 0) {
		prefab = assetManager.getBundle(path.substring(0, i)).get(path.substring(i + 1), Prefab)
	}
	else if (scene.versatile === SceneVersatile.ABSENT) {
		prefab = assetManager.getBundle('core').get(path, Prefab)
	}
	else {
		prefab = assetManager.getBundle('core-' + SceneVersatile.name(scene.versatile)).get(path, Prefab)
		if (!prefab) {
			prefab = assetManager.getBundle('core').get(path, Prefab)
		}
	}
	
	if (!prefab) throw new Error(`Prefab '${path}' is not exists`)
	
	return instantiate(prefab)
}