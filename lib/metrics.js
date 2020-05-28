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

'use strict';

const assert = require('assert');
const dl = require('datalib');
const flatten = require('flat');

/**
 * Retrieve timestamp in milliseconds since Unix epoch for
 * use in NewRelic metrics.
 */
function timestamp() {
    return Date.now();
}

/**
 * Add a start timestamp to the given metrics object.
 *
 * @param {Object} [metrics={}] Metrics object
 * @returns {Object} Metrics object
 */
function start(metrics) {
    metrics = metrics || {};
    return Object.assign(metrics, {
        start: timestamp()
    });
}

/**
 * Add an end timestamp to the given metrics object,
 * calculates duration. Requires start() to be called first.
 *
 * @param {Object} metrics Metrics object
 * @returns {Object} Metrics object
 */
function end(metrics) {
    assert.ok(metrics);
    assert.strictEqual(typeof metrics.start, 'number');

    metrics.end = timestamp();
    metrics.duration = metrics.end - metrics.start;
    return metrics;
}

/**
 * Convert a given summary as calculated by datalib in to a plain object
 * with only the fields we are interested in.
 *
 * @param {Object} summary Summary as calculated by datalib
 * @returns Plain object with only the fields we are interested in
 */
function summaryObject(summary) {
    return {
        min: summary.min,
        max: summary.max,
        mean: summary.mean,
        stdev: summary.stdev,
        median: summary.median,
        q1: summary.q1, // 25th percentile
        q3: summary.q3  // 75th percentile
    };
}

/**
 * Calculate summary statistics from an array-like or iterable object of metrics
 *
 * Input:
 * - array of numbers
 * - array of objects with number attributes
 * - array of nested objects
 *
 * Returns:
 * - Calculated min, max, mean, stdev, median, q1, q3 statistics
 * - Object with the calculated summary statistics if the input was an array of numbers
 * - Object with the calculated summary statistics for each number attribute
 *
 * @param {Array} data Array-like or iterable object of metrics
 * @returns {Object} Summary statistics
 */
function summary(data) {
    const array = Array.from(data);
    if (array.length === 0) {
        return {};
    }
    if (typeof array[0] === "number") {
        return summaryObject(dl.profile(array));
    } else if (typeof array[0] === "object") {
        const result = {};
        array.forEach((obj, index) => {
            array[index] = filterObject(obj);
        });
        const summary = dl.summary(array);
        for (const field of summary) {
            if (field.type === "number") {
                result[field.field] = summaryObject(field);
            }
        }
        return result;
    } else {
        throw Error("not supported");
    }
}

// replaces periods with underscores
// flattens object to a 1D array
function filterObject(obj) {
    const result = {};
    const flattened = flatten(obj);
    Object.keys(flattened).forEach(i => {
        result[i.replace(/\./g, '_')] = flattened[i];
    });
    return result;
}

module.exports = {
    timestamp,
    start,
    end,
    summary
};
