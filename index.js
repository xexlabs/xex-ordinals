const crypto = require('crypto')
const fs = require('fs')
const axios = require('axios')
let cache = {}
const dotenv = require('dotenv')
dotenv.config()
const hiro_api = process.env.HIRO
async function app() {
	const list = JSON.parse(fs.readFileSync('inscriptions.json', 'utf8'))
	let i = 0,
		total = list.length
	let ordinals = []
	for (const r of list) {
		const id = r.inscription
		const url = `https://api.hiro.so/ordinals/v1/inscriptions/${id}`
		const data = await fetchData(url)
		ordinals.push(data)
		//console.log(`${++i}/${total} ${id}`)
	}
	await build_collection(ordinals)
	await gen_png(ordinals)
}
async function gen_png(ordinals) {
	if (!fs.existsSync('images')) {
		fs.mkdirSync('images')
	}
	let i = 0,
		total = ordinals.length
	for (const r of ordinals) {
		const id = r.id
		const file = `./images/${id}.png`
		console.log(`${++i}/${total} ${id}`)
		if (fs.existsSync(file)) {
			console.log('exists', file)
			continue
		}
		const url = `https://api.hiro.so/ordinals/v1/inscriptions/${id}/content` //?type=png`
		const config = {
			headers: {
				'x-hiro-api-key': hiro_api
			},
			responseType: 'arraybuffer'
		}
		const response = await axios.get(url, config)
		const data = response.data
		fs.writeFileSync(file, Buffer.from(data), 'binary')
	}
}
async function build_collection(ordinals) {
	let ma = []
	console.log('ordinals', ordinals.length)
	let number = 1
	for (const ordinal of ordinals) {
		// magic eden
		const magic_eden = {
			id: ordinal.id,
			meta: {
				name: `Xexadon #${number++}`,
				high_res_img_url: `https://ordinals.xexlabs.com/images/${ordinal.id}.png`,
				attributes: [
					{
						trait_type: 'Rarity',
						value: 'Mythic'
					}
				]
			}
		}
		ma.push(magic_eden)
	}
	fs.writeFileSync('magic-eden.json', JSON.stringify(ma, undefined, 4))
}

function generateSHA256Hash(data) {
	const hash = crypto.createHash('sha256')
	hash.update(data)
	return hash.digest('hex')
}
async function fetchData(url) {
	const id = generateSHA256Hash(url)
	if (cache[id]) {
		return cache[id]
	} else {
		try {
			const config = {
				headers: {
					'x-hiro-api-key': hiro_api
				}
			}
			const response = await axios.get(url, config)
			const data = response.data
			cache[id] = data
			fs.writeFileSync('cache.json', JSON.stringify(cache, undefined, 4))
			return data
		} catch (error) {
			console.error(error)
		}
	}
}

async function main() {
	try {
		if (!fs.existsSync('cache.json')) {
			fs.writeFileSync('cache.json', '{}')
		}
		const data = fs.readFileSync('cache.json', 'utf8')
		cache = JSON.parse(data)
		await app()
	} catch (error) {
		console.error('Error reading from cache.json:', error)
	}
}

main()
