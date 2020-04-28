/*
Copyright 2020 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

/* eslint-env mocha */
/* eslint-disable mocha/no-mocha-arrows */

"use strict";

const assert = require("assert");
const { instrument } = require("../lib/instrument");

function asyncTimeout(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(ms)
        }, ms);
    })
}

function assertInRange(actual, expected, range=2) {
    assert.ok(actual >= expected - range, actual <= expected + range);
}

describe("instrument", () => {
    it("sync-func", async () => {
        const metrics = {};
        const result = await instrument(arg => arg, metrics).execute(100);
        assert.strictEqual(result, 100);
        assert.deepStrictEqual(Object.getOwnPropertyNames(metrics), ["start", "end", "duration"]);
        assert.strictEqual(metrics.end - metrics.start, metrics.duration);
    });
    it("sync-func-name", async () => {
        const metrics = {};
        const result = await instrument(arg => arg, metrics, "name").execute(100);
        assert.strictEqual(result, 100);
        assert.deepStrictEqual(Object.getOwnPropertyNames(metrics), ["name"]);
        assert.deepStrictEqual(Object.getOwnPropertyNames(metrics.name), ["start", "end", "duration"]);
        assert.strictEqual(metrics.name.end - metrics.name.start, metrics.name.duration);
    });
    it("sync-func-name-error", async () => {
        const metrics = {};
        try {
            await instrument(() => {
                throw Error("error message")
            }, metrics, "name").execute(100);
            assert.fail("line should not be reached");
        } catch (e) {
            assert.ok(e);
        }
        assert.deepStrictEqual(typeof metrics.name.start, 'number');
        assert.deepStrictEqual(typeof metrics.name.end, 'number');
        assert.deepStrictEqual(typeof metrics.name.duration, 'number');
        assert.strictEqual(metrics.name.end - metrics.name.start, metrics.name.duration);
        assert.strictEqual(metrics.error.message, "error message");
        assert.strictEqual(metrics.error.name, "Error");
    });
    it("async-func", async () => {
        const metrics = {};
        const result = await instrument(asyncTimeout, metrics).execute(100);
        assert.strictEqual(result, 100);
        assert.deepStrictEqual(Object.getOwnPropertyNames(metrics), ["start", "end", "duration"]);
        assert.strictEqual(metrics.end - metrics.start, metrics.duration);
    });
    it("async-func-name", async () => {
        const metrics = {};
        const result = await instrument(asyncTimeout, metrics, "name").execute(100);
        assert.strictEqual(result, 100);
        assert.deepStrictEqual(Object.getOwnPropertyNames(metrics), ["name"]);
        assert.deepStrictEqual(Object.getOwnPropertyNames(metrics.name), ["start", "end", "duration"]);
        assert.strictEqual(metrics.name.end - metrics.name.start, metrics.name.duration);
    });
    it("sync-worker-metrics-error", async () => {
        const metrics = {};
        try {
            await instrument({
                execute: () => {
                    throw Error("error message")
                },
                metrics: (error) => {
                    return { error }
                }
            }, metrics, "name").execute(100);
            assert.fail("line should not be reached");
        } catch (e) {
            assert.ok(e);
        }
        assert.deepStrictEqual(typeof metrics.name.start, 'number');
        assert.deepStrictEqual(typeof metrics.name.end, 'number');
        assert.deepStrictEqual(typeof metrics.name.duration, 'number');
        assert.strictEqual(metrics.name.end - metrics.name.start, metrics.name.duration);
        assert.strictEqual(metrics.error.message, "error message");
        assert.strictEqual(metrics.error.name, "Error");
    });
    it("async-worker-metrics-error", async () => {
        const metrics = {};
        try {
            await instrument({
                execute: async () => {
                    throw Error("error message")
                },
                metrics: async (error) => {
                    return { error }
                }
            }, metrics, "name").execute(100);
            assert.fail("line should not be reached");
        } catch (e) {
            assert.ok(e);
        }
        assert.deepStrictEqual(typeof metrics.name.start, 'number');
        assert.deepStrictEqual(typeof metrics.name.end, 'number');
        assert.deepStrictEqual(typeof metrics.name.duration, 'number');
        assert.strictEqual(metrics.name.end - metrics.name.start, metrics.name.duration);
        assert.strictEqual(metrics.error.message, "error message");
        assert.strictEqual(metrics.error.name, "Error");
    });
    it("sync-worker-metrics-result", async () => {
        const metrics = {};
        const result = await instrument({
            execute: arg => arg,
            metrics: (_, result, metrics) => {
                return { result, metrics }
            }
        }, metrics).execute(100);
        assert.strictEqual(result, 100);
        assert.deepStrictEqual(Object.getOwnPropertyNames(metrics), ["start", "end", "duration", "result", "metrics"]);
        assert.strictEqual(metrics.end - metrics.start, metrics.duration);
        assert.strictEqual(metrics.result, 100);
        assert.strictEqual(metrics.metrics.start, metrics.start);
        assert.strictEqual(metrics.metrics.end, metrics.end);
        assert.strictEqual(metrics.metrics.duration, metrics.duration);
    });
    it("async-worker-metrics-result", async () => {
        const metrics = {};
        const result = await instrument({
            execute: async arg => arg,
            metrics: async (_, result, metrics) => {
                return { result, metrics }
            }
        }, metrics).execute(100);
        assert.strictEqual(result, 100);
        assert.deepStrictEqual(Object.getOwnPropertyNames(metrics), ["start", "end", "duration", "result", "metrics"]);
        assert.strictEqual(metrics.end - metrics.start, metrics.duration);
        assert.strictEqual(metrics.result, 100);
        assert.strictEqual(metrics.metrics.start, metrics.start);
        assert.strictEqual(metrics.metrics.end, metrics.end);
        assert.strictEqual(metrics.metrics.duration, metrics.duration);
    });
    it("async-worker-sampler", async () => {
        const metrics = {};
        let counter = 0;
        const result = await instrument({
            execute: asyncTimeout,
            metrics: (_, result) => {
                return { result }
            },
            sample: () => {
                return ++counter;
            },
            sampleInterval: () => 200
        }, metrics, "name").execute(1000);
        assert.strictEqual(result, 1000);
        assert.strictEqual(metrics.name.end - metrics.name.start, metrics.name.duration);
        assert.strictEqual(metrics.name.min, 1);
        assertInRange(metrics.name.max, 4);
        assertInRange(metrics.name.mean, 2.5);
        assertInRange(Math.round(metrics.name.stdev * 1000) / 1000, 1.291);
        assertInRange(metrics.name.median, 2.5);
        assertInRange(metrics.name.q1, 1.75);
        assertInRange(metrics.name.q3, 3.25);
        assert.strictEqual(metrics.name.result, 1000);
    })
    it("async-worker-sampler-class", async () => {
        const metrics = {};
        // ensure `this` is available in the methods
        class Worker {
            constructor() {
                this.counter = 0;
                this.asyncTimeout = asyncTimeout;
                this.samplingInterval = 200;
            }
            async execute(ms) {
                return this.asyncTimeout(ms);
            }
            async metrics(_, result) {
                return { result, counter: this.counter };
            }
            async sample() {
                return { value: ++this.counter };
            }
            async sampleInterval() {
                return this.samplingInterval;
            }
        }
        const result = await instrument(new Worker(), metrics, "name").execute(1000);
        assert.strictEqual(result, 1000);
        assert.strictEqual(metrics.name.end - metrics.name.start, metrics.name.duration);
        assert.strictEqual(metrics.name.value.min, 1);
        assertInRange(metrics.name.value.max, 4);
        assertInRange(metrics.name.value.mean, 2.5);
        assertInRange(Math.round(metrics.name.value.stdev * 1000) / 1000, 1.291);
        assertInRange(metrics.name.value.median, 2.5);
        assertInRange(metrics.name.value.q3, 3.25);
        assertInRange(metrics.name.value.q1, 1.75);
        assert.strictEqual(metrics.name.result, 1000);
        assertInRange(metrics.name.counter, 4);
    })
});
