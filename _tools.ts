import {assetManager, game, instantiate, Node, Prefab, resources, sys} from 'cc'

export function restartApp() {
	if (sys.isNative) {
		game.pause()
		game.restart()
	}
	else {
		window.location.reload()
	}
}

export function createNodeFromPrefab(prefab: string): Node {
	if (prefab === undefined || prefab === null || prefab == '') throw new Error(`Empty prefab name`)
	
	if (prefab.indexOf(':') < 0) {
		prefab = 'core:' + prefab
	}
	
	const p = prefab.split(':')
	
	const bundle = assetManager.getBundle(p[0])
	if (!bundle) throw new Error(`Bundle '${p[0]}' is not exists`)
	
	const pr = bundle.get(p[1], Prefab)
	if (!pr) throw new Error(`Prefab '${prefab}' is not exists`)
	
	return instantiate(pr)
}