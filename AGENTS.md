# AGENTS.md

## Cursor Cloud specific instructions

This is a Java learning repository: a Maven multi-module aggregator (`pom.xml` at the
root) containing standalone example programs (~250 `main` methods, no runtime services,
no web server, no database). There are no automated tests despite `junit` being declared
in `dependencyManagement` — `mvn test` only compiles. The project targets Java 1.8; the
VM has JDK 21, which compiles the `1.8` source/target fine (with harmless "obsolete" warnings).
Maven (`mvn`) is preinstalled in the environment snapshot.

### Building / linting / testing / running

Standard Maven commands apply (see the root `pom.xml` and per-module `pom.xml` files).
The compiler acts as the linter here (there is no separate lint tool).

- Build/compile: `mvn compile`
- "Test" lifecycle (no real tests): `mvn test`
- Build jars: `mvn package`
- Run an example: compile, then `java -cp <module>/target/classes <fully.qualified.MainClass>`
  - e.g. `java -cp java-base/target/classes com.brianway.learning.java.base.HelloWorld`

### IMPORTANT: `java-multithread` does not compile on Linux (case-sensitive filesystem)

The `java-multithread` module fails to compile because
`.../communication/example7/producer.java` declares `public class Producer` — the filename
casing does not match the public class name. This only compiles on case-insensitive
filesystems (e.g. the original author's macOS). Do NOT let this block environment setup; it
is a pre-existing source bug, not an environment problem.

Build/test the other five modules by excluding it:

```
mvn compile -pl '!java-multithread'
mvn test    -pl '!java-multithread'
mvn package -pl '!java-multithread'
```

The buildable modules are: `java-base`, `java-container`, `java-io`, `java8`, `java-jvm`.
