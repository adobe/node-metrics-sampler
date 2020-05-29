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

const Metrics = require('./metrics');
const interval = require('interval-promise');

/**
 * Function called at a regular interval to gather metrics at a point in time.
 *
 * The function has no arguments, but returns metrics that are accumulated and
 * then summarized once {@link Sampler#finish} is called.
 *
 * @callback SampleFunction
 * @returns {Object} Object with metrics
 */

/**
 * Sampler that invokes a sample function at an interval. Metrics returned by the sample
 * function are summarized.
 */
class Sampler {

    /**
     * Construct a sampler around the given sample function.
     *
     * @param {SampleFunction} sampleFunction Sample function called a the given interval
     * @param {number} [intervalTimeout=100] Interval in ms to call sample function
     */
    constructor(sampleFunction, intervalTimeout) {
        this.samples = [];
        this.sampleFunction = sampleFunction;
        this.stopInterval = false;
        this.interval = intervalTimeout || 100;
    }

    /**
     * Start sampling
     *
     */
    async start() {
        if (this.interval > 0 && !this.intervalPromise) {
            const self = this;
            this.intervalPromise = interval(async (_iteration, stop) => {
                if (self.stopInterval) {
                    stop();
                } else {
                    try {
                        await self.sample();
                    } catch(e) {
                        console.error('Sampler function failed with error ', e.message || e);
                    }
                }
            }, this.interval);
        }
    }

    /**
     * Gather a sample from the sample function
     *
     * @returns {Promise} resolves when the sample is available and added
     */
    async sample() {
        const sample = await this.sampleFunction();
        this.samples.push(sample);
    }


    /**
     * Gather summary stats of metrics
     *
     * @returns {object} summary stats of metrics
     */
    getValues() {
        // calculate summary statistics
        return Metrics.summary(this.samples);
    }

    /**
     * Finish up sampling
     *
     * @returns {Promise} resolves to summary stats of metrics
     */
    async finish() {
        // stop interval timeout
        if (this.intervalPromise) {
            this.stopInterval = true;
            await this.intervalPromise;

        }
        // calculate summary statistics
        return this.getValues();
    }

}

module.exports = {
    Sampler
};
