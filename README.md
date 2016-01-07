# Spark Client Library

Client-side helper library for Telerik KendoUI + Progress JSDO applications.

Requirements
====================
Apache Ant 1.8.x+ (Building)

jQuery 1.9.x (Runtime)

KendoUI 2015.3+ (Runtime)

Progress JSDO 4.2+ (Runtime)

Bootstrap 3.3.x (Optional)

FontAwesome 4.3.x (Optional)

Assumptions
====================

Presense of a **/vendor/** folder within your static application directory.

Installation / Setup
====================

This library should be renamed and included within your application's /vendor/ directory as **/vendor/spark/** just like any other third-party bundle such as KendoUI and jQuery. To use the library simply include **/vendor/spark/lib/spark.min.js** (based on the recommended directory structure) within your application HTML document(s).
Once included in your application, the library will be available as a global object "spark" and accessible via your browser's development console (eg. Chrome DevTools, Firebug for Firefox, etc.) for interrogation of available methods and properties.
Additionally, there is a **/lib/plugins.js** file that provides for extended features in the Progress JSDO. To make use of features like the ability to pass a Kendo criteria object as-is from grids and datasources, this would be highly recommended.

Contributions / Changes
====================

This library should be ready to use as-is. However, if modifications are needed they can be made within the /src/ directory. To prepare for actual usage, run "ant minify" from within the /src/ directory to create a new minified version of the /lib/spark.min.js file.