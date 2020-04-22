# node-metrics-sampler

Library for collecting and gathering metrics

### Installation

```bash
npm install @adobe/metrics-sampler
```

### Sampler Usage

The Sampler can be used to gather metrics over a period of time. For example, let's say we want to collect OS metrics as we read files on our computer.

```
// start sampler that will run every 200ms
const sampler = new Sampler( () => {
			return os.cpus();
        }, 200);
const file = fs.readSync('/path/to/file');

// now we can look at the current values in a summary statistic
console.log(sampler.getValues());
```
When we are done sampling, we can end the sampler interval and retrieve the metrics.
```
const metricsSummary = await sampler.finish();
```

After ending the sampler, any calls to `sampler.finish()` or `sampler.getValues()` will return the summary statistics


### Contributing
Contributions are welcomed! Read the [Contributing Guide](./.github/CONTRIBUTING.md) for more information.

### Licensing
This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
