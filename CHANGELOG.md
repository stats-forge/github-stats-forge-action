# Changelog

## [0.7.0](https://github.com/stats-forge/github-stats-forge-action/compare/v0.6.2...v0.7.0) (2026-09-14)


### ⚠ BREAKING CHANGES

* `path` is required. Steps that relied on the default have to name their output file.

### Features

* make the `path` input required ([#51](https://github.com/stats-forge/github-stats-forge-action/issues/51)) ([26ffe1f](https://github.com/stats-forge/github-stats-forge-action/commit/26ffe1f972b2e8c9961bad10d681771b880898bf))

## [0.6.2](https://github.com/stats-forge/github-stats-forge-action/compare/v0.6.1...v0.6.2) (2026-09-13)


### Bug Fixes

* report the default `path` output with forward slashes on Windows ([#45](https://github.com/stats-forge/github-stats-forge-action/issues/45)) ([51df532](https://github.com/stats-forge/github-stats-forge-action/commit/51df53254a03f6a4f110e9aac894560033c2005d))

## [0.6.1](https://github.com/stats-forge/github-stats-forge-action/compare/v0.6.0...v0.6.1) (2026-09-13)


### Bug Fixes

* update `@stats-forge/github-stats-forge-core` to 0.7.1 ([#41](https://github.com/stats-forge/github-stats-forge-action/issues/41)) ([53421b4](https://github.com/stats-forge/github-stats-forge-action/commit/53421b47961be73861c25bfd85f9576cfe261df1))

## [0.6.0](https://github.com/stats-forge/github-stats-forge-action/compare/v0.5.0...v0.6.0) (2026-09-13)


### Features

* update `@stats-forge/github-stats-forge-core` to 0.7 ([#20](https://github.com/stats-forge/github-stats-forge-action/issues/20)) ([ad93114](https://github.com/stats-forge/github-stats-forge-action/commit/ad93114b34563b94b2083d9ce952ac82276c2096))


### Bug Fixes

* classify card errors by code, not by `retryable` ([#21](https://github.com/stats-forge/github-stats-forge-action/issues/21)) ([3b72642](https://github.com/stats-forge/github-stats-forge-action/commit/3b72642552221fffbf1d0a1e1289ac8b82664e68))
* default the `token` input to `github.token` ([#23](https://github.com/stats-forge/github-stats-forge-action/issues/23)) ([8e60bcc](https://github.com/stats-forge/github-stats-forge-action/commit/8e60bccf4261aad9dfc1aebcbb0a40829d22492a))
* log the repository-owner default instead of warning about it ([#26](https://github.com/stats-forge/github-stats-forge-action/issues/26)) ([310e190](https://github.com/stats-forge/github-stats-forge-action/commit/310e190d3296e13c7fbd30f335995e44a68f3e71))
* read each card's account option off the identities core declares ([#24](https://github.com/stats-forge/github-stats-forge-action/issues/24)) ([b920a9f](https://github.com/stats-forge/github-stats-forge-action/commit/b920a9f2e6c3d37eb929ea23d9d830bfde728331))
* reject nested option values instead of sending `[object Object]` ([#25](https://github.com/stats-forge/github-stats-forge-action/issues/25)) ([f676e68](https://github.com/stats-forge/github-stats-forge-action/commit/f676e68cb20fbe9cd39a128ce127e06b06fe40d6))


### Documentation

* document the path and token defaults in action.yml ([#31](https://github.com/stats-forge/github-stats-forge-action/issues/31)) ([8aeef81](https://github.com/stats-forge/github-stats-forge-action/commit/8aeef81f064bceec6a093f68937453f8cb030f4b))
* drop the Contributing section from the README ([#29](https://github.com/stats-forge/github-stats-forge-action/issues/29)) ([6d92f7e](https://github.com/stats-forge/github-stats-forge-action/commit/6d92f7e32f80f419c936cf3baddee4ec990ab194))
* note pinning the action to a commit SHA ([#27](https://github.com/stats-forge/github-stats-forge-action/issues/27)) ([d331ab6](https://github.com/stats-forge/github-stats-forge-action/commit/d331ab6523ecfde91b0692f9c16b7ef443842a25))
* simplify CONTRIBUTING ([#30](https://github.com/stats-forge/github-stats-forge-action/issues/30)) ([c7856d5](https://github.com/stats-forge/github-stats-forge-action/commit/c7856d5417cc707f6c645212b35550adbb80c7cf))
* simplify the README prose ([#28](https://github.com/stats-forge/github-stats-forge-action/issues/28)) ([7eac748](https://github.com/stats-forge/github-stats-forge-action/commit/7eac748598a4cbbbe4ab34a170b839c0077ec2a6))

## [0.5.0](https://github.com/stats-forge/github-stats-forge-action/compare/v0.4.0...v0.5.0) (2026-09-11)


### Features

* update `@stats-forge/github-stats-forge-core` to 0.6 ([#15](https://github.com/stats-forge/github-stats-forge-action/issues/15)) ([be917b1](https://github.com/stats-forge/github-stats-forge-action/commit/be917b16221aa73566ca061581c328048ecf981b))

## [0.4.0](https://github.com/stats-forge/github-stats-forge-action/compare/v0.3.0...v0.4.0) (2026-09-08)


### Features

* update `@stats-forge/github-stats-forge-core` to 0.4 ([#12](https://github.com/stats-forge/github-stats-forge-action/issues/12)) ([15ddb76](https://github.com/stats-forge/github-stats-forge-action/commit/15ddb7661ce9c40d26e299f818aa5c2feb11c6e9))

## [0.3.0](https://github.com/stats-forge/github-stats-forge-action/compare/v0.2.0...v0.3.0) (2026-09-06)


### Features

* update `@stats-forge/github-stats-forge-core` to 0.2 ([#10](https://github.com/stats-forge/github-stats-forge-action/issues/10)) ([4f8c30f](https://github.com/stats-forge/github-stats-forge-action/commit/4f8c30f184063ba77782691487a2c1f97ab0d789))

## [0.2.0](https://github.com/stats-forge/github-stats-forge-action/compare/v0.1.1...v0.2.0) (2026-09-05)


### Features

* update `@stats-forge/github-stats-forge-core` to 0.10 ([#7](https://github.com/stats-forge/github-stats-forge-action/issues/7)) ([d299639](https://github.com/stats-forge/github-stats-forge-action/commit/d299639770c5573cd3dea8db9ced19853dbae59d))


### Bug Fixes

* stop blaming the network for a rejected option ([#3](https://github.com/stats-forge/github-stats-forge-action/issues/3)) ([9e30baa](https://github.com/stats-forge/github-stats-forge-action/commit/9e30baa639e37d609b6bcc2b487a0f2aeed03ee3))

## [0.1.1](https://github.com/stats-forge/github-stats-forge-action/compare/v0.1.0...v0.1.1) (2026-09-01)


### Bug Fixes

* **ci:** move the major tag with git, using the release app token ([52f0012](https://github.com/stats-forge/github-stats-forge-action/commit/52f0012aa794bdf3e45b89c83b16e3a0a5fc15b9))
