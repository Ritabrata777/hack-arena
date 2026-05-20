'use server'
import clientPromise from '@/lib/mongodb'

export async function GET() {
	try {
		const client = await clientPromise
		const dbName = process.env.MONGODB_DB_NAME
		if (!dbName) {
			return new Response(JSON.stringify({ ok: false, error: 'MONGODB_DB_NAME not set' }), { status: 500 })
		}
		const db = client.db(dbName)
		await db.command({ ping: 1 })
		return Response.json({ ok: true })
	} catch (error) {
		return new Response(JSON.stringify({ ok: false, error: String(error?.message || error) }), { status: 500 })
	}
}


