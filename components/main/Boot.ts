import {_decorator, AssetManager, assetManager, JsonAsset, Label, ProgressBar, resources, sys} from 'cc'
import {SceneOrientation} from '../../Scene'
import {NormalizedComponent} from '../NormalizedComponent'

@_decorator.ccclass('Boot')
@_decorator.menu('lib/Boot')
export class Boot extends NormalizedComponent {
	public static initializer: BootInitializer
	
	public config: any
	
	private _progressBar: ProgressBar
	
	@_decorator.property({type: Label, visible: true})
	private _versionLabel: Label = null
	
	private _loading: Array<LoadingPart> = []
	
	private _progressValue: number = 0
	private _progressPrevious: number = 0
	private _progressCurrent: number = 0
	
	private _contentName: string
	private _contentPrefab: string
	
	public nextLoadingPart() {
		this._progressPrevious = this._progressCurrent
		this.drawProgress(this._progressPrevious)
		
		if (this._loading.length == 0) {
			this.complete()
		}
		else {
			const part = this._loading.shift()
			this._progressCurrent = part.percent
			part.run()
		}
	}
	
	public progressPart(value: number) {
		this.drawProgress(this._progressPrevious + (this._progressCurrent - this._progressPrevious) * value)
	}
	
	public drawVersion(name: string) {
		this._versionLabel.string = name
	}
	
	public drawVersionBuild(build: string) {
		this._versionLabel.string += '-' + build
	}
	
	public finalize(onComplete: () => void) {
		const r = Boot.initializer(this.config, p => this.progressPart(p), onComplete)
		this._contentName = r.name
		this._contentPrefab = r.prefab
		
		Boot.initializer = null
	}
	
	protected onLoad() {
		super.onLoad()
		
		this._progressBar = this.getComponentInChildren(ProgressBar)
		
		this._loading.push(new ConfigLoadingPart(this, 0.05))
		
		if (scene.orientation === SceneOrientation.ABSENT) {
			this._loading.push(new BundleLoadingPart(this, 0.80, 'core'))
		}
		else {
			this._loading.push(new BundleLoadingPart(this, 0.60, 'core'))
			this._loading.push(new BundleLoadingPart(this, 0.80, 'core-' + SceneOrientation.nameLower(scene.orientation)))
		}
		
		this._loading.push(new InitLoadingPart(this, 1))
		
		
		this.nextLoadingPart()
	}
	
	private drawProgress(value: number) {
		if (value > this._progressValue) {
			this._progressValue = value
			this._progressBar.progress = value
		}
	}
	
	private complete() {
		this.drawProgress(1)
		
		scene.content.replace(this._contentName, this._contentPrefab)
	}
}

abstract class LoadingPart {
	constructor(protected boot: Boot, public percent: number) {}
	
	public abstract run()
	
	protected complete() {
		this.boot.nextLoadingPart()
		this.boot = null
	}
	
	protected error(error: Error) {
		scene.catchError(error)
	}
}

class ConfigLoadingPart extends LoadingPart {
	public run() {
		resources.load('config-local', JsonAsset, (e, a) => {
			if (e) resources.load('config', JsonAsset, (e, a) => this.completeEmbedded(false, e, a))
			else this.completeEmbedded(true, e, a)
		})
	}
	
	
	private completeEmbedded(local: boolean, e: Error, a: JsonAsset) {
		if (e) {
			this.error(new Error('Embedded config loading failed'))
			return
		}
		const data = a.json as any
		data.local = local
		
		if (data.url) {
			this.boot.progressPart(0.5)
			
			this.boot.drawVersion(data.version)
			const url = `${data.url}?version=${data.version}&platform=${this.defineConfigPlatform()}`
			console.debug(`Boot: load config`, url)
			
			assetManager.cacheManager && assetManager.cacheManager.removeCache(url)
			assetManager.loadRemote<JsonAsset>(url, {cacheAsset: false, cacheEnabled: false, ext: '.json'}, (e, a) => this.completeRemote(e, a))
		}
		else {
			this.boot.drawVersion('local')
			this.doComplete(data)
		}
	}
	
	private completeRemote(e: Error, asset: JsonAsset) {
		if (e) {
			this.error(new Error('Remote config loading failed'))
			return
		}
		
		this.doComplete(asset.json as any)
	}
	
	private doComplete(data: any) {
		console.debug('Boot: config loaded', data)
		
		this.boot.config = data
		
		if (data.build !== undefined) {
			this.boot.drawVersionBuild(data.build)
		}
		
		const downloader = assetManager.downloader
		
		if (data.resources) {
			// @ts-ignore
			downloader._remoteServerAddress = data.resources
		}
		
		if (data.bundles) {
			const bundles = data.bundles
			const bundleNames = Object.keys(bundles)
			// @ts-ignore
			downloader.remoteBundles.push(...bundleNames)
			
			for (const bundle of bundleNames) {
				// @ts-ignore
				downloader.bundleVers[bundle] = bundles[bundle]
			}
		}
		
		this.complete()
	}
	
	private defineConfigPlatform(): string {
		// noinspection JSUnreachableSwitchBranches
		switch (sys.platform) {
			case sys.Platform.IOS:
				return 'native-ios'
			case sys.Platform.ANDROID:
				return 'native-android'
			case sys.Platform.DESKTOP_BROWSER:
				return 'browser-desktop'
			case sys.Platform.MOBILE_BROWSER:
				return 'browser-mobile'
			default:
				return 'unsupported'
		}
	}
}

class BundleLoadingPart extends LoadingPart {
	
	constructor(boot: Boot, percent: number, private name: string) {
		super(boot, percent)
	}
	
	public run() {
		assetManager.loadBundle(this.name, (e, b) => this.completeBundle(e, b))
	}
	
	private completeBundle(e: Error, bundle: AssetManager.Bundle) {
		if (e) {
			this.error(new Error(`Fail to load ${this.name}`))
			return
		}
		
		this.boot.progressPart(0.1)
		
		bundle.loadDir('/',
			(completed, total) => this.progressAssets(completed, total),
			(error) => this.completeAssets(error)
		)
	}
	
	private progressAssets(completed: number, total: number) {
		this.boot.progressPart(0.1 + (completed / total) * 0.9)
	}
	
	private completeAssets(e: Error) {
		if (e) {
			this.error(new Error(`Fail to load ${this.name} assets`))
			return
		}
		
		this.complete()
	}
}

class InitLoadingPart extends LoadingPart {
	public run() {
		this.boot.finalize(() => this.complete())
	}
}

export type BootInitializer = (config: any, onProgress: (percent: number) => void, onComplete: () => void) => {name: string, prefab: string}


export function registerBootInitializer(initializer: BootInitializer) {
	Boot.initializer = initializer
}