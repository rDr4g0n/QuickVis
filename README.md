# QuickVis
QuickVis is a graphing library with the goal of visualizing data in a way that is fast and easy to read. The visualizations are minimally interactive, not pan or zoomable, and do not refresh themselves. You put some data in and you get a visualization. END!

Take a look at [the live demos](https://zenoss.github.io/QuickVis/)

![some quickvis vis's](quickvis1.png)

## Development
To develop this project you will need `node` (v6 or greater) `yarn`, and good ol' make.

```
# install dependencies
yarn install
```

Now you can use `make` to do things

```
# build the js lib
make

# bring up the demo page with livereload for active development
make watch

# run unit tests
# TODO - reimplement this
make test

# continuously run unit tests for active development
# TODO - reimplement this
make tdd

# build the js lib, run tests, zip lib and map,
# TODO - tests
make release
```

Note, while `make release` will create a transpiled lib which supports IE11 and up, you will need a browser with support for some ES6 and ES7 features to develop this.

## Releasing
Use git flow to release a version to the `master` branch. A jenkins job can be triggered manually to build and publish the
artifact to zenpip.  During the git flow release process, update the version in the `VERSION` file by removing the `dev`
suffix and then increment the version number in the `develop` branch.

### Versioning
The version convention is for the `develop` branch to have the next release version, a number higher than what is
 currently released, with the `-dev` suffix. The `master` branch will have the currently released version.  For
 example, if the currently released version is `1.1.0` the version in the `develop` will be `1.1.1-dev`,

### Release Steps
1. Check out the `master` branch and make sure to have latest `master`.
  * `git checkout master`
  * `git pull origin master`

2. Check out the `develop` branch.
  * `git checkout develop`
  * `git pull origin develop`

3. Start release of next version. The version is usually the version in the `VERSION` file minus the `-dev` suffix.  e.g., if the version
  in `develop` is `1.1.1-dev` and in `master` `1.1.0`, then the
  `<release_name>` will be the new version in `master`, i.e. `1.1.1`.
  *  `git flow release start <release_name>`

4. Update the `VERSION` file. e.g set it to `1.1.1`

5. run `make release` to make sure everything builds properly and to update the built lib to the latest version

6. Commit and tag everything, don't push.
  * `git commit....`
  * `git flow release finish <release_name>`
  * `git push origin --tags`

7. You will be on the `develop` branch again. While on `develop` branch, edit the the `VERSION` file to
be the next development version. For example, if you just released version 1.1.1, then change `VERSION` to
`1.1.2-dev`. Don't forget to update the version in `package.json` (bump version number, don't include `-dev`).

8. Check in `develop` version bump and push.
  * `make release` to bump the library version
  * `git commit...`
  * `git push`

9. Push the `master` branch which should have the new released version.
  * `git checkout master`
  * `git push`

10. Have someone manually kick off the jenkins job to build master which will publish the images to Docker hub. TODO - Jenkins should build automatically

## Updating Demo Page
The demo page for this project is at [zenoss.github.io/QuickVis](https://zenoss.github.io/QuickVis), and should be updated when anything is changed. After the changes are released to master, you can build the demo page with `make demo`. Copy the `www` directory somewhere safe, then checkout the github pages branch with `git checkout gh-pages`. Finally, copy the contents of the `www` directory into the current working tree, commit, and push.

## Development Best Practices
The pieces at play here are the usual supects: **Model**, **View**, and **ViewModel**. **Model** is whatever data is passed by the user into the `update()` function, and should be treated as immutable. **View** is the HTML template that is eventually passed into the DOM. The **ViewModel** is the instance of the visualization (eg: Sparkline or StackedBar), and contains the model as well as template helper methods for getting human-readable info from the model. In this way, the ViewModel binds the View together with the Model.

In order to keep things as reasonable as one can expect in the wild west of webdev, there are some best practices that should be followed when creating new visualizations or modifying existing ones. Take a look at `src/Sparkline.js` for lots of comments about the module's structure.

* Only touch the DOM in the `_render()` method or draw helper methods, but no where else! The DOM is dangerous and scary and should be hidden far far away. However, to keep `_render()` from getting too unwieldy, you can create draw helpers to do specific things like `drawLine()`. It's ok to access the DOM inside helpers as well, but treat the DOM like some sort of terrifying mystical creature that you don't really understand because it basically is (and that's why libs like react exist!).

[TODO - sample code]

* Keep templates as logic-less as possible. If you want to do any logic, write a helper method. Template helper methods have the task of taking obtuse model data, like `1467038751`, and turning it into something a human can use, such as "Mon, 27 Jun 2016 14:45:51 GMT". Prefer tiny little helpers that do one little thing and compose them together to take imcomprehensible model data and turn it into useful visualization.

[TODO - sample code]

* Don't modify the model. If you need to generate something new from the model data (like taking the average of an array of numbers), do it inside the `_update()` method, and attach the newly generated info to the viewmodel (aka `this`). If the new data is purely for presentation (like converting a timestamp to date), then it belongs in a template helper, not on the viewmodel.

[TODO - sample code]

## Some Other Notes
* QuickVis visualizations will try to fill the entire available space. It is up to the containing DOM element to control size

## TODO
* tests
* update demo page with new stuff
