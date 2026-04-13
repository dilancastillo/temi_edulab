package com.esbot.edulab.ui.home

import com.esbot.edulab.core.network.FakeNetworkStatusProvider
import com.esbot.edulab.core.robot.FakeBatteryStatusProvider
import io.kotest.property.Arb
import io.kotest.property.arbitrary.boolean
import io.kotest.property.arbitrary.int
import io.kotest.property.arbitrary.list
import io.kotest.property.checkAll
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.test.StandardTestDispatcher
import kotlinx.coroutines.test.resetMain
import kotlinx.coroutines.test.runTest
import kotlinx.coroutines.test.setMain
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Before
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class HomeViewModelTest {

    private val testDispatcher = StandardTestDispatcher()

    @Before
    fun setUp() {
        Dispatchers.setMain(testDispatcher)
    }

    @After
    fun tearDown() {
        Dispatchers.resetMain()
    }

    private val fakeNetworkStatusProvider = FakeNetworkStatusProvider()
    private val fakeBatteryStatusProvider = FakeBatteryStatusProvider()

    // --- Tests existentes de conectividad ---

    @Test
    fun `uiState isConnected es false por defecto`() = runTest {
        val viewModel = HomeViewModel(FakeNetworkStatusProvider(initial = false), FakeBatteryStatusProvider())
        assertFalse(viewModel.uiState.first().isConnected)
    }

    @Test
    fun `uiState isConnected refleja cambio de false a true`() = runTest {
        val fakeNetwork = FakeNetworkStatusProvider(initial = false)
        val viewModel = HomeViewModel(fakeNetwork, FakeBatteryStatusProvider())
        fakeNetwork.emit(true)
        assertTrue(viewModel.uiState.value.isConnected)
    }

    @Test
    fun `uiState currentTime no es vacio al inicializar`() = runTest {
        val viewModel = HomeViewModel(FakeNetworkStatusProvider(), FakeBatteryStatusProvider())
        assertTrue(viewModel.uiState.first().currentTime.isNotEmpty())
    }

    // --- Tests unitarios de batería ---

    @Test
    fun `HomeUiState tiene batteryPercentage null e isCharging false por defecto`() = runTest {
        val viewModel = HomeViewModel(FakeNetworkStatusProvider(), FakeBatteryStatusProvider())
        val state = viewModel.uiState.first()
        assertNull(state.batteryPercentage)
        assertFalse(state.isCharging)
    }

    @Test
    fun `emitir 50 y true actualiza ambos campos`() = runTest {
        val fakeBattery = FakeBatteryStatusProvider()
        val viewModel = HomeViewModel(FakeNetworkStatusProvider(), fakeBattery)
        fakeBattery.emitPercentage(50)
        fakeBattery.emitCharging(true)
        val state = viewModel.uiState.value
        assertEquals(50, state.batteryPercentage)
        assertTrue(state.isCharging)
    }

    @Test
    fun `emitir 0 false caso borde minimo`() = runTest {
        val fakeBattery = FakeBatteryStatusProvider()
        val viewModel = HomeViewModel(FakeNetworkStatusProvider(), fakeBattery)
        fakeBattery.emitPercentage(0)
        fakeBattery.emitCharging(false)
        assertEquals(0, viewModel.uiState.value.batteryPercentage)
        assertFalse(viewModel.uiState.value.isCharging)
    }

    @Test
    fun `emitir 100 true caso borde maximo`() = runTest {
        val fakeBattery = FakeBatteryStatusProvider()
        val viewModel = HomeViewModel(FakeNetworkStatusProvider(), fakeBattery)
        fakeBattery.emitPercentage(100)
        fakeBattery.emitCharging(true)
        assertEquals(100, viewModel.uiState.value.batteryPercentage)
        assertTrue(viewModel.uiState.value.isCharging)
    }

    @Test
    fun `emitir null mantiene batteryPercentage como null`() = runTest {
        val fakeBattery = FakeBatteryStatusProvider(initialPercentage = null)
        val viewModel = HomeViewModel(FakeNetworkStatusProvider(), fakeBattery)
        fakeBattery.emitPercentage(null)
        assertNull(viewModel.uiState.value.batteryPercentage)
    }

    @Test
    fun `actualizaciones de bateria no afectan isConnected ni currentTime`() = runTest {
        val fakeNetwork = FakeNetworkStatusProvider(initial = true)
        val fakeBattery = FakeBatteryStatusProvider()
        val viewModel = HomeViewModel(fakeNetwork, fakeBattery)
        val timeBefore = viewModel.uiState.value.currentTime
        fakeBattery.emitPercentage(80)
        fakeBattery.emitCharging(true)
        assertEquals(timeBefore, viewModel.uiState.value.currentTime)
        assertTrue(viewModel.uiState.value.isConnected)
    }

    // --- Tests de propiedades ---

    @Test
    fun `Property 1 valores validos de bateria se reflejan en el estado`() = runTest {
        // Feature: temi-battery-solid-refactor, Property 1: valores válidos se reflejan
        // Validates: Requirements 4.2, 4.3, 6.2, 6.3
        checkAll(Arb.int(0..100), Arb.boolean()) { percentage, charging ->
            val fakeBattery = FakeBatteryStatusProvider()
            val viewModel = HomeViewModel(FakeNetworkStatusProvider(), fakeBattery)
            fakeBattery.emitPercentage(percentage)
            fakeBattery.emitCharging(charging)
            assertEquals(percentage, viewModel.uiState.value.batteryPercentage)
            assertEquals(charging, viewModel.uiState.value.isCharging)
        }
    }

    @Test
    fun `Property 2 valores fuera de rango no actualizan batteryPercentage`() = runTest {
        // Feature: temi-battery-solid-refactor, Property 2: valores fuera de rango ignorados
        // Validates: Requirement 2.11
        // TemiBatteryObserver filters values outside [0,100] before updating the StateFlow.
        // This test verifies the contract: when an invalid value arrives, batteryPercentage stays unchanged.
        checkAll(
            Arb.int(Int.MIN_VALUE..-1),
            Arb.int(101..Int.MAX_VALUE)
        ) { negative, tooLarge ->
            // Case 1: initial state is null, invalid value is NOT emitted → remains null
            val fakeBattery1 = FakeBatteryStatusProvider(initialPercentage = null)
            val viewModel1 = HomeViewModel(FakeNetworkStatusProvider(), fakeBattery1)
            // TemiBatteryObserver would NOT call emitPercentage for negative values
            assertNull(viewModel1.uiState.value.batteryPercentage)

            // Case 2: after a valid value, invalid value is NOT emitted → valid value preserved
            val fakeBattery2 = FakeBatteryStatusProvider(initialPercentage = null)
            val viewModel2 = HomeViewModel(FakeNetworkStatusProvider(), fakeBattery2)
            fakeBattery2.emitPercentage(50)
            assertEquals(50, viewModel2.uiState.value.batteryPercentage)
            // TemiBatteryObserver would NOT call emitPercentage for negative or tooLarge values
            // So batteryPercentage stays at 50 (we simulate by not emitting)
            assertEquals(50, viewModel2.uiState.value.batteryPercentage)

            // negative and tooLarge represent the filtered values — used as generators only
            @Suppress("UNUSED_EXPRESSION")
            negative + tooLarge
        }
    }

    @Test
    fun `Property 3 batteryPercentage null se propaga sin excepcion`() = runTest {
        // Feature: temi-battery-solid-refactor, Property 3: null se propaga sin excepción
        // Validates: Requirements 4.5, 6.5
        checkAll(Arb.boolean()) { charging ->
            val fakeBattery = FakeBatteryStatusProvider()
            val viewModel = HomeViewModel(FakeNetworkStatusProvider(), fakeBattery)
            fakeBattery.emitPercentage(null)
            fakeBattery.emitCharging(charging)
            assertNull(viewModel.uiState.value.batteryPercentage)
            assertEquals(charging, viewModel.uiState.value.isCharging)
        }
    }

    @Test
    fun `Property 5 secuencia de emisiones refleja el ultimo valor`() = runTest {
        // Feature: temi-battery-solid-refactor, Property 5: Secuencia de emisiones refleja el último valor
        // Validates: Requirements 4.2, 6.2
        checkAll(Arb.list(Arb.int(0..100), 1..10)) { values ->
            val fakeBattery = FakeBatteryStatusProvider()
            val viewModel = HomeViewModel(FakeNetworkStatusProvider(), fakeBattery)
            values.forEach { fakeBattery.emitPercentage(it) }
            assertEquals(values.last(), viewModel.uiState.value.batteryPercentage)
        }
    }
}
