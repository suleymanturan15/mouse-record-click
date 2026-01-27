@echo off
setlocal

set APP_HOME=%~dp0
set WRAPPER_JAR=%APP_HOME%gradle\wrapper\gradle-wrapper.jar
set WRAPPER_SHARED_JAR=%APP_HOME%gradle\wrapper\gradle-wrapper-shared.jar
set GRADLE_CLI_JAR=%APP_HOME%gradle\wrapper\gradle-cli.jar

if defined JAVA_HOME (
  set JAVA_CMD=%JAVA_HOME%\bin\java.exe
) else (
  set JAVA_CMD=java
)

set CLASSPATH=%WRAPPER_JAR%;%WRAPPER_SHARED_JAR%;%GRADLE_CLI_JAR%

"%JAVA_CMD%" -classpath "%CLASSPATH%" org.gradle.wrapper.GradleWrapperMain %*
endlocal

