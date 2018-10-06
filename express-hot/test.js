const {
	SyncHook,
	SyncBailHook,
	SyncWaterfallHook,
	SyncLoopHook,
	AsyncParallelHook,
	AsyncParallelBailHook,
	AsyncSeriesHook,
	AsyncSeriesBailHook,
	AsyncSeriesWaterfallHook
 } = require("tapable");

 class Car {
	constructor() {
		this.hooks = {
			accelerate: new SyncHook(["newSpeed1"]),
			// break: new SyncHook(),
			calculateRoutes: new AsyncParallelHook(["source", "target", "routesList"])
		};
    }
    setSpeed(newSpeed) {
        console.log('### setSpeed(newSpeed)', newSpeed)
		this.hooks.accelerate.call(newSpeed, 34);
    }
    useNavigationSystemPromise(source, target) {
		const routesList = [];
		return this.hooks.calculateRoutes.promise(source, target, routesList).then(() => {
			console.log('##routesList', routesList);
		});
    }
    useNavigationSystemAsync(source, target, callback) {
		const routesList = [];
		this.hooks.calculateRoutes.callAsync(source, target, routesList, err => {
            console.log('##callAsync', err, routesList);
			// if(err) return callback(err);
			// callback(null, routesList);
		});
	}

	/* ... */
}

const myCar = new Car();

// Use the tap method to add a consument
// myCar.hooks.break.tap("WarningLampPlugin", () => {
//     console.log('WarningLampPlugin')
// });

myCar.hooks.accelerate.tap("LoggerPlugin", (newSpeed, ss) => {
    console.log(`Accelerating to ${newSpeed} +  ${ss}` );
});

myCar.hooks.accelerate.tap("LoggerPluginn", (newSpeed, ss) => {
    console.log(`bccelerating to ${newSpeed} +  ${ss}` );
});

myCar.setSpeed(23);

myCar.hooks.calculateRoutes.tapAsync("BingMapsPlugin", (source, target, routesList, callback) => {
    setTimeout(() => {
        routesList.push({type: 'tapAsync'});
        callback();
    });
});
myCar.hooks.calculateRoutes.tapAsync("BingMapsPlugin", (source, target, routesList, callback) => {
    setTimeout(() => {
        routesList.push({type: 'tapAsync1'});
        callback();
    });
});

myCar.useNavigationSystemAsync();
