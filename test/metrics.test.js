/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */
/* eslint-disable mocha/no-mocha-arrows */

"use strict";

const assert = require("assert");
const Metrics = require("../lib/metrics");

describe("metrics", () => {
    describe("timestamps", () => {
        it("timestamp", () => {
            const timestamp = Metrics.timestamp();
            assert.ok(typeof timestamp === "number");
        });
        it("start-empty", () => {
            const start = Metrics.start();
            assert.ok(typeof start.start === "number");
        });
        it("start-object", () => {
            const metrics = {};
            const start = Metrics.start(metrics);
            assert.ok(typeof start.start === "number");
            assert.strictEqual(metrics, start);
        });
        it("end", () => {
            const start = Metrics.start();
            const end = Metrics.end(start);
            assert.ok(typeof end.start === "number");
            assert.ok(typeof end.end === "number");
            assert.strictEqual(end.end - end.start, end.duration);
            assert.strictEqual(start, end);
        });
    });
    describe("summary", () => {
        it("numbers-array", () => {
            const summary = Metrics.summary([1, 2, 3, 4, 5, 6, 7, 8]);
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
        });
        it("numbers-set", () => {
            const summary = Metrics.summary(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
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
        });
        it("objects-array", () => {
            const summary = Metrics.summary([{
                counter: 1,
                constant: 5
            }, {
                counter: 2,
                constant: 5
            }, {
                counter: 3,
                constant: 5
            }, {
                counter: 4,
                constant: 5
            }, {
                counter: 5,
                constant: 5
            }, {
                counter: 6,
                constant: 5
            }, {
                counter: 7,
                constant: 5
            }, {
                counter: 8,
                constant: 5
            }]);
            // limit stdev to 3 digits after the dot for comparison
            summary.counter.stdev = Math.round(summary.counter.stdev * 1000) / 1000;
            assert.deepStrictEqual(summary, {
                counter: {
                    max: 8,
                    mean: 4.5,
                    median: 4.5,
                    min: 1,
                    q1: 2.75,
                    q3: 6.25,
                    stdev: 2.449
                },
                constant: {
                    max: 5,
                    mean: 5,
                    median: 5,
                    min: 5,
                    q1: 5,
                    q3: 5,
                    stdev: 0
                }
            });
        });

        it('object array of objects', () => {
            const summary = Metrics.summary([
                {
                    mem: {
                        usage: 1,
                        percentage: 3 },
                    cpu: {
                        usage: 2
                    }
                }]);
            assert.deepStrictEqual(summary, {
                mem_usage: { min: 1, max: 1, mean: 1, stdev: NaN, median: 1, q1: 1, q3: 1 },
                mem_percentage: { min: 3, max: 3, mean: 3, stdev: NaN, median: 3, q1: 3, q3: 3 },
                cpu_usage: { min: 2, max: 2, mean: 2, stdev: NaN, median: 2, q1: 2, q3: 2 }
            });
        }
        );

        it('object array of objects, ignores the undefined attributes', () => {
            const summary = Metrics.summary([
                {
                    counter: 2,
                    constant: 5,
                    extra: undefined
                }, {
                    counter: 5,
                    constant: 5,
                    extra: 1
                },{
                    counter: 2,
                    constant: 5,
                    extra: 1
                }
            ]);
            // limit stdev to 3 digits after the dot for comparison
            summary.counter.stdev = Math.round(summary.counter.stdev * 1000) / 1000;
            console.log(summary);
            assert.deepStrictEqual(summary, {
                counter: { min: 2, max: 5, mean: 3, stdev: 1.732, median: 2, q1: 2, q3: 3.5 },
                constant: { min: 5, max: 5, mean: 5, stdev: 0, median: 5, q1: 5, q3: 5 },
                extra: { min: 1, max: 1, mean: 1, stdev: 0, median: 1, q1: 1, q3: 1 }
            });
        });


        it('object array of objects, ignores the unmatched attributes', () => {
            const summary = Metrics.summary([
                {
                    counter: 2,
                    constant: 5
                }, {
                    counter: 5,
                    constant: 5,
                    extra: 1
                },{
                    counter: 2,
                    constant: 5,
                    extra: 1
                }
            ]);
            // limit stdev to 3 digits after the dot for comparison
            summary.counter.stdev = Math.round(summary.counter.stdev * 1000) / 1000;
            console.log(summary);
            assert.deepStrictEqual(summary, {
                counter: { min: 2, max: 5, mean: 3, stdev: 1.732, median: 2, q1: 2, q3: 3.5 },
                constant: { min: 5, max: 5, mean: 5, stdev: 0, median: 5, q1: 5, q3: 5 }
            });
        });

        it('object-array contains periods', () => {
            const summary = Metrics.summary([
                {
                    "mem.usage": 1,
                    "mem.percentage": 3,
                    "cpu.usage": 2
                }]);
            // limit stdev to 3 digits after the dot for comparison
            assert.deepStrictEqual(summary, {
                mem_usage: { min: 1, max: 1, mean: 1, stdev: NaN, median: 1, q1: 1, q3: 1 },
                mem_percentage: { min: 3, max: 3, mean: 3, stdev: NaN, median: 3, q1: 3, q3: 3 },
                cpu_usage: { min: 2, max: 2, mean: 2, stdev: NaN, median: 2, q1: 2, q3: 2 }
            });
        });
    });
});
