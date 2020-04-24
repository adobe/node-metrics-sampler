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
const { Sampler } = require("../lib/sampler");
const { promisify } = require("util");
const setTimeoutPromise = promisify(setTimeout);

function sampleFunction() {
    let counter = 0;
    return () => {
        return ++counter;
    }
}

function assertInRange(actual, expected, range=2) {
    console.log('actual:', actual);
    console.log('expected:', expected);
    if (typeof actual === "object") {
        for (const element in actual) {
            assert.ok(actual[element] >= expected[element] - range, actual[element] <= expected[element] + range);
        }
    } else {
        assert.ok(actual >= expected - range, actual <= expected + range);
    }
}

describe("sampler", () => {
    it("counter-manual-8", async () => {
        const sampler = new Sampler(sampleFunction(), 0);
        // sampler.start();
        for (let i = 0; i < 8; ++i) {
            await sampler.sample();
        }
        const summary =  sampler.getValues();
        // limit stdev to 3 digits after the dot for comparison
        summary.stdev = Math.round(summary.stdev * 1000) / 1000;
        assert.deepStrictEqual(summary, {
            max: 8,
            mean: 4.5,
            median: 4.5,
            min: 1,
            q1: 2.75,
            q3: 6.25,
            stdev: 2.449
        });
    })
    it("counter-auto-8", async () => {
        const sampler = new Sampler(sampleFunction(), 200);
        sampler.start();
        await setTimeoutPromise(1700);
        const summary = await sampler.finish();
        // limit stdev to 3 digits after the dot for comparison
        summary.stdev = Math.round(summary.stdev * 1000) / 1000;
        assertInRange(summary, {
            max: 8,
            mean: 4.5,
            median: 4.5,
            min: 1,
            q1: 2.75,
            q3: 6.25,
            stdev: 2.449
        });
    });

    it("should work with a sample function that returns a nested object", async () => {
        const sampler = new Sampler(() => {
            return {
                memory: {
                    containerUsage: 6666,
                    containerUsagePercentage:5.67657 },
                cpuacct: {
                    usage: 100
                }
            };
        }, 200);
        await sampler.start();
        await setTimeoutPromise(1700);
        const summary = await sampler.finish();
        assert.deepStrictEqual(summary, 
            {
                memory_containerUsage: {
                  min: 6666,
                  max: 6666,
                  mean: 6666,
                  stdev: 0,
                  median: 6666,
                  q1: 6666,
                  q3: 6666
                },
                memory_containerUsagePercentage: {
                  min: 5.67657,
                  max: 5.67657,
                  mean: 5.67657,
                  stdev: 0,
                  median: 5.67657,
                  q1: 5.67657,
                  q3: 5.67657
                },
                cpuacct_usage: {
                  min: 100,
                  max: 100,
                  mean: 100,
                  stdev: 0,
                  median: 100,
                  q1: 100,
                  q3: 100
                }
              });
    });

    it("should log error but not throw if sample function errors persistently", async () => {
        const sampler =  new Sampler( () => {
            throw new Error('Error sampling!!!!!');
        });
        await setTimeoutPromise(300);
        const result = await sampler.finish();
        assert.equal(typeof result, 'object'); // results should be an empty object because sampler function failed
        assert.equal(Object.entries(result).length, 0);
    });

    it("should work as normal if sample function fails once", async () => {
        let count = 0;
        const sampler =  new Sampler( () => {
            if (count > 0) {
                return 1;
            }
            count++;
            throw new Error('Error sampling!!!!!');
        });
        sampler.start();
        await setTimeoutPromise(400);
        const result = await sampler.finish();
        assert.equal(typeof result, 'object'); // results should be an empty object because sampler function failed
        assertInRange(result, {
            max: 1,
            mean: 1,
            median: 1,
            min: 1,
            q1: 1,
            q3: 1,
            stdev: 0
        });
    });

    it("should do nothing on second call to `start`", async () => {
        const sampler = new Sampler(sampleFunction(), 200);
        sampler.start();
        await setTimeoutPromise(1700);
        sampler.start();
        const summary = await sampler.finish();
        // limit stdev to 3 digits after the dot for comparison
        summary.stdev = Math.round(summary.stdev * 1000) / 1000;
        assertInRange(summary, {
            max: 8,
            mean: 4.5,
            median: 4.5,
            min: 1,
            q1: 2.75,
            q3: 6.25,
            stdev: 2.449
        });
    })
});
