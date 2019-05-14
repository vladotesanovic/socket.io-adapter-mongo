/**
 * Module dependencies.
 */

var uid2 = require('uid2')
		, mubsub = require('mongopubsub')
		, msgpack = require('msgpack-js')
		, Adapter = require('socket.io-adapter')
		, debug = require('debug')('socket.io-mongo')
		, mongodbUri = require('mongodb-uri');

/**
 * Module exports.
 */

module.exports = adapter;

/**
 * Returns a mongo Adapter class.
 *
 * @return {Mongo} adapter
 * @api public
 * @param uri
 * @param opts
 */

function adapter(uri, opts) {
	opts = opts || {};

	// handle options only
	if ('string' !== typeof uri) {
		console.error('URI is not a string');
		return;
	}

    // opts
    var key = opts.key || 'socket.io';

	// init clients if needed
    var client = mubsub(uri, opts);

	// this server's key
	var uid = uid2(6);

	var channel = client.channel(key);

	/**
	 * Adapter constructor.
	 *
	 * @param {String} namespace name
	 * @api public
	 */

	function Mongo(nsp) {
		Adapter.call(this, nsp);

		channel.subscribe(key, this.onmessage.bind(this));
	}

	/**
	 * Inherits from `Adapter`.
	 */

	Mongo.prototype.__proto__ = Adapter.prototype;

	/**
	 * Called with a subscription message
	 *
	 * @api private
	 */

	Mongo.prototype.onmessage = function (msg) {
		if (uid == msg.uid || !msg.uid) return debug('ignore same uid');

		var args = msgpack.decode(msg.data.buffer);
		if (args[0] && args[0].nsp === undefined)
			args[0].nsp = '/';

		if (!args[0] || args[0].nsp != this.nsp.name) return debug('ignore different namespace');
		args.push(true);
		this.broadcast.apply(this, args);
	};

	/**
	 * Broadcasts a packet.
	 *
	 * @param {Object} packet to emit
	 * @param {Object} options
	 * @param {Boolean} whether the packet came from another node
	 * @api public
	 */

	Mongo.prototype.broadcast = function (packet, opts, remote) {
		Adapter.prototype.broadcast.call(this, packet, opts);

		if (!remote) {
			channel.publish(key, { uid: uid, data: msgpack.encode([packet, opts]) });
		}
	};

	return Mongo;

}
