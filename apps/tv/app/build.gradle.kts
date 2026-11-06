plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}
android {
    namespace = "com.rivalsintel.tv"
    compileSdk = 35
    defaultConfig {
        applicationId = "com.rivalsintel.tv"
        minSdk = 23
        targetSdk = 28
        versionCode = 1
        versionName = "0.1.0"
        buildConfigField("String", "API_BASE_URL", "\"https://YOUR-RIVALS-INTEL-API.example.com\"")
    }
    buildFeatures { buildConfig = true }
}
dependencies {
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("com.google.zxing:core:3.5.3")
}
